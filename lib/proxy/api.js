M = {config: ''};

M.error = require(M.config.API_ROOT + 'error');
M.mongo = require(M.config.API_ROOT + 'db/mongo');

module.exports = function (callback) {
    M.mongo.connect(M.config.mongoDB.name, function (err, db) {

        if (err) {
            console.error("Could not connect to MongoDB");
            console.error(err);
            process.exit(2);
        }
        
        var Cache = require(M.config.MONO_ROOT + 'lib/api/cache');

        M.db = db;
        M.cache = {apps: Cache()};
        M.util = require(M.config.API_ROOT + 'util');
        M.app = require(M.config.API_ROOT + 'app');

        callback(null);
    });
};
