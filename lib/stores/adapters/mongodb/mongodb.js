var M = process.mono;
var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;

var CONNECTION_STRING_RE = new RegExp('^([a-zA-Z0-9]+)://([a-zA-Z0-9\\._-]+):(\\d{4,5})/([a-zA-Z0-9\\._-]+)$');
var serverOptions = {
    native_parser: true,
    server: {
        poolSize: 3
    }
};

var clients = {};
var cbBuffer = {};

// TODO cahce available stores
var M_stores = {};


exports.connect =  connect;
exports.model = model;

// model constructor??
function model () {}

// TODO test callback buffering
function connect (config, callback) {
    
    // check config
    if (!config) {
        return callback(new Error('Invalid connection string.'));
    }
    
    // check store cache
    if (M_stores[config.db]) {
        return callback(null, M_stores[config.db]);
    }
    
    // buffer callbacks when db is connecting
    if (cbBuffer[config.db] instanceof Array) {
        return cbBuffer[config.db].push(callback);
    }
    
    // save callback in buffer
    (cbBuffer[config.db] = cbBuffer[config.db] || []).push(callback);
    
    // get and authenticate db with cached client
    if (clients[config.client]) {
        return getAndAuthenticateDb(clients[config.client], config);
    } 
    
    // get client
    clients[config.client] = new MongoClient(new Server(config.host, config.port, serverOptions));
    
    // open client connection
    clients[config.client].open(function (err, client) {
            
        if (err) {
            return callbacks(config.db, err, db);
        }
        
        // get and authenticate db
        getAndAuthenticateDb(client, config);
    });
}

function getAndAuthenticateDb (client, config) {
    
    // get db
    var db = client.db(config.name);
    
    // authenticate
    db.authenticate(config.user, config.pass, function(err) {
        
        // handle error
        if (err) {
            return callbacks(config.db, err);
        }
        
        M_stores[config.db] = db;
        callbacks(config.db, null, db);
    });
} 

// call callbacks in callback buffer
function callbacks (key, err, db) {
    for (var i = 0; i < cbBuffer[key].length; ++i) {
        if (typeof cbBuffer[key][i] === 'function') {
            cbBuffer[key][i](err, db);
        }
    }
    
    delete cbBuffer[key];
}