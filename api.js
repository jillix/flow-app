
M = { config: require('./lib/config') };
M.mongo = require('./lib/api/db/mongo');

module.exports = function (callback) {
    M.mongo.connect(M.config.mongoDB.name, function (err, db) {

        if (err) {
            console.error("Could not connect to MongoDB");
            console.error(err);
            process.exit(2);
        }

        M.db = db;

        if (M.config.app) {
            M.config.app = M.mongo.ObjectID(M.config.app);
        }

        M.error = require('./lib/api/error');
        M.util = require('./lib/api/util');
        M.fs = require('./lib/api/fs');
        M.repo = require('./lib/api/repo');

        M.app = require('./lib/api/app');
        M.module = require('./lib/api/module');

        M.operation = require('./lib/api/operation');
        M.session = require('./lib/api/session');
        M.datasource = require('./lib/api/datasource');
        M.database = require('./lib/api/database');

        M.runtime = require('./lib/api/runtime');

        callback(null);
    });
};

