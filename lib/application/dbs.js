var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;

var CONNECTION_STRING_RE = new RegExp('^mongodb://([a-zA-Z0-9\\._-]+):(\\d{4,5})/([a-zA-Z0-9\\._-]+)$');
var mongoClients = {};

module.exports = createDbClients;

function createDbClients (config, callback) {
    
    var dbClients = {};
    var dbConfig = config.databases || {};
    var dbUser = config.owner;
    var dbPassword = config.apiKey;
    var dbCount = Object.keys(dbConfig).length;
    var mongoUrl;
    
    // check config
    if (!dbCount || !dbUser || !dbPassword) {
        return handleCallback(callback, new Error('Invalid db config.'));
    }
    
    // prepare count
    --dbCount;
    
    // authenticate after db is open
    var openDbHandler = function (err, db) {
        
        // retrun if error happend
        if(dbCount === 0) {
            return;
        }
        
        // handle error
        if (err) {
            dbCount = 0;
            return handleCallback(callback, err);
        }
        
        // authenticate
        db.authenticate(dbUser, dbPassword, function(err) {
            
            // handle error
            if (err) {
                dbCount = 0;
                return handleCallback(callback, err);
            }
            
            if (!--dbCount) {
                handleCallback(callback, null, dbClients);
            }
        });
    };
    
    // connect servers and get databases
    for (var db in dbConfig) {
        
        // check mongo url
        if (!(mongoUrl = dbConfig[db].match(CONNECTION_STRING_RE))) {
            return handleCallback(callback, new Error('Invalid connection string.'));
        }
        
        var connectionKey = mongoUrl[1] + ':' + mongoUrl[2];
        
        // create only one client per url
        if (!mongoClients[connectionKey]) {
            mongoClients[connectionKey] = new MongoClient(new Server(mongoUrl[1], mongoUrl[2]), {native_parser: true});
        }
        
        // get database
        dbClients[db] = mongoClients[connectionKey].db(mongoUrl[3]);
        dbClients[db].open(openDbHandler);
    }
}



function handleCallback (callback, err, data) {
    process.nextTick(function () {
        callback(err, data);
    });
}
