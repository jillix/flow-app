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

// open dbs
M.store = {};

module.exports = getDb;

function getDb (connection, callback, log) {
    
    config = parseConnection(connection);
    
    // check config
    if (!config) {
        return callback(new Error('Invalid connection string.'));
    }
    
    if (log) {
        console.log('connection:', connection);
        console.log('config:', config);
        console.log('buffer:', cbBuffer);
        console.log('store:', Object.keys(M.store));
    }
    
    // check store cache
    if (M.store[config.db]) {
        return callback(null, M.store[config.db]);
    }
    
    // buffer callbacks when db is connecting
    if (cbBuffer[config.db] instanceof Array) {
        return cbBuffer[config.db].push(callback);
    }
    
    // save callback in buffer
    (cbBuffer[config.db] = cbBuffer[config.db] || []).push(callback);
    
    // get client
    clients[config.client] = clients[config.client] || new MongoClient(new Server(config.host, config.port, serverOptions));
    
    // open db
    clients[config.client].db(config.name).open(function (err, db) {
            
        if (err) {
            return callbacks(config.db, err, db);
        }
        
        // authenticate
        db.authenticate(config.user, config.pass, function(err) {
            
            // handle error
            if (err) {
                return callbacks(config.db, err);
            }
            
            M.store[config.db] = db;
            callbacks(config.db, null, db);
        });
        
    });
}

// parse connection string
function parseConnection (connection) {
    
    // check connection
    if (!(connection = connection.match(CONNECTION_STRING_RE))) {
        return;
    }
    
    // create connection object
    connection = {
        type: connection[1],
        host: connection[2],
        port: connection[3],
        name: connection[4],
        user: M.config.owner,
        pass: M.config.apiKey
    };
    
    // check connection values
    if (!connection.type || !connection.host || !connection.port || !connection.name) {
        return;
    }
    
    // add cache keys
    connection.client = connection.type + '://' + connection.host + ':' + connection.port;
    connection.db = connection.client + '/' + connection.name;
    
    return connection;
    
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
