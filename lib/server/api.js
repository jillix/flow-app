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

// setup store factory
process.mono.store = require(config.paths.LIB_ROOT + 'stores/factory');
