var EventEmitter = require('events').EventEmitter;
var config = require('./config');

// create api object
process.mono = new EventEmitter();
process.mono.config = config;
process.mono.error = require(config.paths.LIB_ROOT + 'utils/error');

// create caches
var Cache = require(config.paths.LIB_ROOT + 'utils/cache');
process.mono.cache = {
    projects: Cache(),
    stores: Cache(),
    models: Cache()
};

// setup store factory
//process.mono.store = require(config.paths.LIB_ROOT + 'stores/factory');
