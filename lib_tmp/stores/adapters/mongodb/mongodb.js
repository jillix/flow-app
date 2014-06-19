var M = process.mono;
var mongo = require('mongodb');
var Server = mongo.Server;
var MongoClient = mongo.MongoClient;
var serverOptions = {
    native_parser: true,
    server: {
        poolSize: 3
    }
};

var clients = {};
var cbBuffer = {};

// connected dbs
var dbs = {};

exports.connect =  connect;
exports.model = model;

// model constructor??
function model () {}

// TODO test callback buffering
function connect (user, pass, config, callback) {

    // check config
    if (!config) {
        return callback(new Error('Invalid connection string.'));
    }

    // check store cache
    if (dbs[config.database]) {
        return callback(null, dbs[config.database]);
    }

    // buffer callbacks when db is connecting
    if (cbBuffer[config.database] instanceof Array) {
        return cbBuffer[config.database].push(callback);
    }

    // save callback in buffer
    (cbBuffer[config.database] = cbBuffer[config.database] || []).push(callback);

    // get and authenticate db with cached client
    if (clients[config.client]) {
        return getAndAuthenticateDb(user, pass, clients[config.client], config);
    }

    // get client
    clients[config.client] = new MongoClient(new Server(config.host, config.port, serverOptions));

    // open client connection
    clients[config.client].open(function (err, client) {

        if (err) {
            return callbacks(config.database, err, db);
        }

        // get and authenticate db
        getAndAuthenticateDb(user, pass, client, config);
    });
}

function getAndAuthenticateDb (user, pass, client, config) {

    // get db
    var db = client.db(config.database);

    // authenticate
    db.authenticate(user, pass, function(err) {

        // handle error
        if (err) {
            return callbacks(config.database, err);
        }

        dbs[config.database] = db;
        callbacks(config.database, null, db);
    });
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
