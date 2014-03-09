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
M.db = {};

module.exports = getDb;

function parseConnection (connection, callback) {
    
    // check connection
    if (!(connection = connection.match(CONNECTION_STRING_RE))) {
        return callback(new Error('Invalid connection string.'));
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
    
    // add cache keys
    connection.client = connection.type + '://' + connection.host + ':' + connection.port;
    connection.db = connection.client + '/' + connection.name;
    
    return connection;
    
}

function getDb (connection, callback) {
    
    config = parseConnection(connection);
    
    // get client
    var client;
    if (clients[config.client]) {
        client = clients[config.client];
    } else {
        client = clients[config.client] = new MongoClient(new Server(config.host, config.port, serverOptions));
    }
    
    // get db
    if (M.db[config.db]) {
        return callback(null, M.db[config.db]);
    }
    
    // buffer callbacks when db is connecting
    if (cbBuffer[config.db] instanceof Array) {
        return cbBuffer[config.db].push(callback);
    }
    
    // open db
    (cbBuffer[config.db] = cbBuffer[config.db] || []).push(callback);
    client.db(config.name).open(function (err, db) {
        
        if (err) {
            return callbacks(config.db, err, db);
        }
        
        // authenticate
        db.authenticate(config.user, config.pass, function(err) {
            
            // handle error
            if (err) {
                return callbacks(config.db, err);
            }
            
            M.db[config.db] = db;
            callbacks(config.db, null, db);
        });
        
    });
}

// call callbacks in callback buffer
function callbacks (key, err, db) {
    for (var i = 0; i < cbBuffer[key].length; ++i) {
        cbBuffer[key][i](err, db);
    }
    
    delete cbBuffer[key];
}
