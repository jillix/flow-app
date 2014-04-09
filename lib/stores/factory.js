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

// available stores
M.stores = {};

module.exports = connect;


////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');

// TODO make this configs configurable
var systemStoreApiKey = 'systemStore';
var storeModelId = '';
var adapatersPath = __dirname + '/adapters/';

// adapter cache
var adapters = {};

// read available store adapters
var availableAdapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var adapterFolderName in availableAdapters) {
    adapters[adapterFolderName] = adapatersPath + adapterFolderName;
}

// create a new store
function factory (config, callback) {
    
    // check if adpater exists
    if (!adapters[config.adapter]) {
        return callback('store: adapter "' + config.adapter + '" not found.');
    }
    
    // TODO callback buffering
    
    // require adapter
    if (typeof adapters[config.adapter] === 'string') {
        
        adapters[config.adapter] = require(adapters[config.adapter]);
        
        // connect to store
        adapters[config.adapter].connect(config, callback);
    }
    
    // return connected adapter
    callback(null, adapters[config.adapter]);
}

// fetch a store config from the system store
function fetchStore (name, callback) {
    
    // get store model
    M[systemStoreApiKey].model(storeModelId, function (err, model) {
        
        if (err) {
            return callback(err);
        }
        
        // read store config
        model.read({name: name}, function (err, config) {
            
            if (err) {
                return callback(err);
            }
            
            // create store
            factory(config, callback);
        });
    });
}

// setup store factory
function setup (config, callback) {
    
    // create system store
    factory(config, function (err, store) {
        
        if (err) {
            return callback(err);
        }
        
        // add system store to api 
        M[systemStoreApiKey] = store;
        
        // add fetch store method to api
        M.store = fetchStore;
        
        callback();
    });
}

////////////////////////////////////////////////////////////////////////////////

// TODO test callback buffering
function connect (connection, callback) {
    
    // TODO fetch store by name
    
    var config = parseConnection(connection);
    
    // check config
    if (!config) {
        return callback(new Error('Invalid connection string.'));
    }
    
    // check store cache
    if (M.stores[config.db]) {
        return callback(null, M.stores[config.db]);
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
        
        M.stores[config.db] = db;
        callbacks(config.db, null, db);
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
