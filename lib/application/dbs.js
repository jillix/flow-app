var M = process.mono;
var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;

var CONNECTION_STRING_RE = new RegExp('^mongodb://([a-zA-Z0-9\\._-]+):(\\d{4,5})/([a-zA-Z0-9\\._-]+)$');
var mongoClients = {};
var mongoClientsDb = {};

module.exports = createDbClients;

function createDbClients (dbConfig, callback) {
    
    var dbClients = {};
    var dbUser = M.config.owner;
    var dbPassword = M.config.apiKey;
    var dbCount = Object.keys(dbConfig).length;
    var mongoUrl;
    
    // check config
    if (!dbCount || !dbUser || !dbPassword) {
        return callback(new Error('Invalid db config.'));
    }
    
    // prepare count
    --dbCount;
    
    // authenticate after db is open
    var openDbHandler = function (err, db) {
        
        // return if error happend
        if(dbCount === null) {
            return;
        }
        
        // handle error
        if (err) {
            dbCount = null;
            return callback(err);
        }
        // authenticate
        db.authenticate(dbUser, dbPassword, function(err) {
            
            // handle error
            if (err) {
                dbCount = null;
                return callback(err);
            }
            
            if (!--dbCount) {
                callback(null, dbClients);
            }
        });
    };
    
    // connect servers and get databases
    for (var db in dbConfig) {
        
        // check mongo url
        if (!(mongoUrl = dbConfig[db].match(CONNECTION_STRING_RE))) {
            return callback(new Error('Invalid connection string.'));
        }
        
        if (mongoClientsDb[dbConfig[db]]) {
            openDbHandler(null, mongoClientsDb[dbConfig[db]]);
            continue;
        }
        
        var connectionKey = mongoUrl[1] + ':' + mongoUrl[2];
        
        // create only one client per server
        if (!mongoClients[connectionKey]) {
            mongoClients[connectionKey] = new MongoClient(new Server(mongoUrl[1], mongoUrl[2]), {native_parser: true});
        }
        
        // get database
        dbClients[db] = mongoClients[connectionKey].db(mongoUrl[3]);
        dbClients[db].open(openDbHandler);
        mongoClientsDb[dbConfig[db]] = dbClients[db];
    }
}

function handleCallback (callback, err, data) {
    //process.nextTick(function () {
        callback(err, data);
    //});
}
