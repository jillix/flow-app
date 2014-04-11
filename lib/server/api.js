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
var setupStoreFactory = require(config.paths.LIB_ROOT + 'stores/factory');
var storeType = 'mongodb';
var serverStoreConfig = {
    host: config.dbHost,
    port: config.dbPort,
    name: 'mono',
    user: 'server',
    pass: config.dbPwd
};

// TODO make application model configurable
process.mono.config.applicationModel = 'm_applications';

setupStoreFactory(storeType, serverStoreConfig, function (err, store) {
    process.mono.emit('ready');
});
