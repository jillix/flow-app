// Dependencies
var Orient = require('oriento');

// Cache objects
var clients = {};
var dbs = {};

module.exports = function (user, pass, config, callback) {

    config = Object(config);

    // Check store cache
    // TODO Same host?
    if (dbs[config.database]) {
        return callback(null, dbs[config.database]);
    }

    var client = null;
    if (client = clients[config.client]) {
        dbs[config.database] = client.use(config.database);
        callback(null, dbs[config.database]);
    }

    // Get client
    // TODO Memory leak?
    client = clients[config.client] = new Oriento({
       host: config.host || "localhost",
       port: config.port || 2424,
       httpPort: config.httpPort || 2480,
       username: user,
       password: pass
    });

    // Get database
    dbs[config.database] = client.use(config.database);
    callback(null, dbs[config.database]);
};
