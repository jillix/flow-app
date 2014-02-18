var fs = require('fs');
var path = require('path');

var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var MongoServer = mongo.Server;
var mongoClient = new MongoClient(new MongoServer('localhost', 27017));

var root = path.normalize(__dirname + '/../');
var appCache = root + '/cache/apps/';
var appName = 'admin';
var repo = 'https://github.com/jillix/admin.git';
var userName = 'admin@jillix.com';
var userPwd = '1234';
var systemDb = 'mono';

// check if application repo exists
if (!fs.existsSync(appCache + appName)) {
    return console.log(
        'No admin app "' + appName + '" found!\n' +
        'Please clone your admin app to mono/cache/apps/.\n' +
        'example: git clone git@github.com:jillix/admin.git'
    );
}

// get the mono database
getDatabases(function (err, dbs, dbClient) {
    
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
    var API = require(appCache + appName + '/api');
    API(function (err, api) {
        
        // create/get user
        api.user.get(userName, function (err, user) {
            
            if (err) {
                return finish(err);
            }
            
            // reset admin app if admin user exists
            if (user) {
                return api.app.resetDev(user, repo, function (err, appId) {
                    finish(err, appId, true);
                });
            }
            
            // create new user
            api.user.create(userName, userPwd, function (err, user) {
                
                if (err) {
                    return finish(err);
                }
                
                // clone and install admin app
                api.app.cloneDev(user, repo, function (err, appId) {
                    finish(err, appId);
                });
            });
        });
    });
});

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
        // TODO check if admin db user exsits
        
        // ensure indexes
        ensureIndexes(db, function (err) {
            
            if (err) {
                callback(err);
            }
            
            callback(null, {
                mono: db
            }, mongoClient);
        });
    });
}

function ensureIndexes (db, callback) {
    
    // ensure m_application indexes
    db.ensureIndex('m_appliactions', {domains: 1}, {unique: true}, function (err) {
        
        if (err) {
            return callback(err);
        }
        
        // ensure m_users indexes
        db.ensureIndex('m_users', {name: 1}, {unique: true}, callback);
    });
}

return;
