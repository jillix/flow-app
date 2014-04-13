var EventEmitter = require('events').EventEmitter;
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var Server = mongo.Server;
var config = require('./config');

// TODO make main store config configurable
var storeType = 'mongodb';
var serverStoreConfig = {
    host: 'localhost',
    port: '27017',
    name: 'mono',
    user: 'server',
    
    // default mono db password
    pass: '1234'
};
var applicationModel = 'm_applications';

// create api object
process.mono = new EventEmitter();
process.mono.config = config;
process.mono.error = require(config.paths.LIB_ROOT + 'error');
process.mono.cache = require(config.paths.LIB_ROOT + 'cache')();


var setupStoreFactory = require(config.paths.LIB_ROOT + 'stores/factory');


process.mono.config.applicationModel = 'm_applications';

setupStoreFactory(storeType, serverStoreConfig, function (err, store) {
    process.mono.emit('ready');
});
