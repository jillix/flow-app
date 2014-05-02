var EventEmitter = require('events').EventEmitter;
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var Server = mongo.Server;
var config = require('./config');

// TODO make main store config configurable, maybe in a json file?
config.applicationModel = 'm_projects';
var storeType = 'mongodb';
var storeConfig = {
    host: 'localhost',
    port: '27017',
    name: 'mono',
    user: 'server',
    pass: '1234'
};

// create api object
process.mono = new EventEmitter();
process.mono.config = config;
process.mono.error = require(config.paths.LIB_ROOT + 'error');
process.mono.cache = require(config.paths.LIB_ROOT + 'cache')();

// setup store factory
require(config.paths.LIB_ROOT + 'stores/factory')(storeType, storeConfig, function (err, store) {
    process.mono.emit('ready');
});
