M = { config: require('../config') };
M.error = require(M.config.API_ROOT + 'error');
M.mongo = require(M.config.API_ROOT + 'db/mongo');

// TODO use M.error
if (!M.config.app) {
    console.error("This server cannot be started without an application ID");
    process.exit(1);
}

var Cache = require(M.config.API_ROOT + 'cache');

// ***************************************************************************
// TODO this is a temporary solution until we have authentication
try {
    M.config.credentials = require(M.config.MONO_ROOT + '/tmp/credentials');
} catch (e) {
    var sampleCreds = {
        github: { type: 'basic', username: 'your_github_username', password: 'your_github_password' },
        bitbucket: { username: 'your_bitbucket_username', password: 'your_bitbucket_password' }
    };
    // TODO use M.error
    console.error(JSON.stringify(sampleCreds));
    console.error('Please provide your Git credentials in tmp/credentials.json as above.');
    process.exit(1);
}
// ***************************************************************************

module.exports = function (callback) {
    M.mongo.connect(M.config.mongoDB.name, function (err, db) {

        if (err) {
            // TODO use M.error
            console.error("Could not connect to MongoDB");
            console.error(err);
            process.exit(2);
        }

        M.db = db;
        M.app = require(M.config.API_ROOT + 'app');
        
        // get application object
        M.app.get(M.mongo.ObjectID(M.config.app), function (err, app) {    
           
            if (err) {
                console.log(err.message || err.toString());
                process.exit(4);
            }
           
            M.config.app = app;

            // TODO remove this and add it to a M.app.validate function that fails if something is not OK with the app
            //  - the app does not have public role (this should be enforced through the database)
            //  - the user owning the app cannot start more application
            //  - the app is under quatantine
            //  - etc.
            // TODO use M.error
            if (isNaN(M.config.app.publicRole)) {
                console.error("Could not determine the public user for application: " + M.config.app.id);
                process.exit(4);
            }

            M.cache = {
                miids: Cache(),
                modules: Cache(),
                client: Cache()
            };

            M.util = require(M.config.API_ROOT + 'util');
            M.fs = require(M.config.API_ROOT + 'fs');
            M.repo = require(M.config.API_ROOT + 'repo');
            M.module = require(M.config.API_ROOT + 'module');
            M.operation = require(M.config.API_ROOT + 'operation');
            M.session = require(M.config.API_ROOT + 'session');
            M.datasource = require(M.config.API_ROOT + 'datasource');
            M.database = require(M.config.API_ROOT + 'database');
            M.runtime = require(M.config.API_ROOT + 'runtime');

            callback(null);
        });
    });
};

