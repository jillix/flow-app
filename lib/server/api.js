var EventEmitter = require('events').EventEmitter;
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var Server = mongo.Server;
var config = require('./config');

// create api object
process.mono = new EventEmitter();
process.mono.config = config;
process.mono.error = require(config.paths.LIB_ROOT + 'error');
process.mono.cache = require(config.paths.LIB_ROOT + 'cache')();

// TEST new store factory
var storeFactory = require(config.paths.LIB_ROOT + 'stores/factory');
var serverStoreConfig = {
    adapter: 'mongodb',
    config: {
        host: config.dbHost,
        port: config.dbPort,
        database: 'mono'
    }
};

storeFactory(serverStoreConfig, function () {
    console.log(arguments);
});

// connect to db
var mongoClient = new MongoClient(new Server(config.dbHost, config.dbPort, {poolSize: 10}), {native_parser: true});
mongoClient.open(function(err, mongoClient) {
    
    if (err) {
        return process.mono.emit('error', err);
    }

    var db = mongoClient.db('mono', {w: 0});

    db.authenticate('server', config.dbPwd, function(err, data) {

        if (err) {
            return process.mono.emit('error', err);
        }

        // save collection in app api
        process.mono.db = {
            applications: db.collection('m_applications')
        };

        process.mono.emit('ready');
    });
});
