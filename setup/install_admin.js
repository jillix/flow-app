var fs = require('fs');
var path = require('path');
var git = require('gitty');

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var MongoServer = mongo.Server;
var mongoClient = new MongoClient(new MongoServer('localhost', 27017));
var systemDb = 'mono';
var monoDb = mongoClient.db(systemDb);

var root = path.normalize(__dirname + '/../');
var repo = 'git@github.com:jillix/admin.git';
var appName = repo.replace(/(git@)|(\.[a-z0-9]+:)|(\/)|(\.git)/g, '.').slice(1, -1);
var appCache = root + 'cache/apps/' + appName + '/';

var userName = 'admin@jillix.com';
var userPwd = '1234';
var userRole = '530650dc6d8405c53b5841a3';

// check if app exists in cache
fs.exists(appCache, function (exists) {
    
    if (!exists) {
        // clone admin app to cache
        return git.clone(appCache, repo, function (err) {
            
            if (err) {
                return finish(err);
            }
            
            getDatabases(getApiAndUser);
        });
    }
    
    getDatabases(getApiAndUser);
});

// get the mono database
function getApiAndUser (err, dbs, dbClient) {
    
    if (err) {
        return finish(err);
    }
    
    // mimic process.mono
    process.mono = {
        db: dbs,
        dbClient: dbClient,
        paths: {MONO_ROOT: root}
    };

    // get api
    var API = require(appCache + 'api');
    API(function (err, api) {
        
        // create/get user
        api.user.get(userName, function (err, user) {
            
            if (err) {
                return finish(err);
            }
            
            if (user) {
                return installAdmin(api, user, repo);
            }
            
            // create new user
            api.user.create(userName, userPwd, userRole, function (err, user) {
                
                if (err) {
                    return finish(err);
                }
                
                installAdmin(api, user, repo);
            });
        });
    });
}

function installAdmin (api, user, repo) {
    // add user to mono db
    monoDb.addUser(user._id.toString(), user.apiKey, {roles: ['readWrite']}, function (err) {
        
        if (err) {
            return finish(err);
        } 
    
        // clone and install admin app
        api.app.cloneDev(user, repo, function (err, appId) {
            finish(err, appId);
        });
    });
}

function finish (err, appId, re) {
    
    mongoClient.close();
    
    if (err) {
        return console.error(err);
    }
    
    console.log('Admin app "' + appId + '" succesfully ' + (re ? 're-' : '') + 'installed.');
}

function getDatabases (callback) {
    mongoClient.open(function(err, mongoClient) {
        
        if (err) {
            callback(err);
        }
        
        var db = mongoClient.db(systemDb);
        
        // TODO check if server db user exists
        
        ensureIndexes(monoDb, function (err) {
            
            if (err) {
                callback(err);
            }
            
            callback(null, {mono: monoDb}, mongoClient);
        });
    });
}

function ensureIndexes (db, callback) {
    
    // ensure m_application indexes
    db.ensureIndex('m_applications', {domains: 1}, {unique: true}, function (err) {
        
        if (err) {
            return callback(err);
        }
        
        // ensure m_users indexes
        db.ensureIndex('m_users', {name: 1}, {unique: true}, callback);
    });
}

return;
