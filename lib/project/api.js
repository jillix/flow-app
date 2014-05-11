var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Static = require('node-static');
var config = require('./config');
var Cache = require(config.paths.LIB_ROOT + 'utils/cache');

// create server object
process.mono = new EventEmitter();
process.mono.config = config;

// create caches
process.mono.cache = {
    client: Cache(),
    instances: Cache(),
    stores: Cache(),
    models: Cache(),
    views: Cache(),
    snippets: Cache()
};

// error handling
process.mono.error = require(config.paths.LIB_ROOT + 'utils/error');

// static file servers
process.mono.file = {
    client: new Static.Server(config.paths.CLIENT_ROOT, {cache: 604800}),
    module: new Static.Server(config.paths.MODULE_ROOT, {cache: 604800}),
    public: new Static.Server(config.paths.PUBLIC_ROOT, {cache: 604800})
};

// setup store factory
process.mono.store = require(config.paths.LIB_ROOT + 'stores/factory');

// setup session middleware
require(config.paths.MIDDLEWARE + 'session')(function (err) {
    
    // terminate process on error
    if (err) {
        throw new Error(err);
    }
    
    // init and cache core module instance
    require(config.paths.MODULE + 'module')();
    
    // emit api ready
    process.mono.emit('ready');
});
