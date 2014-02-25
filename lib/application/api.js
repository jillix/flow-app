var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Static = require('node-static');
var config = require('./config');
var Cache = require(config.paths.LIB_ROOT + 'cache');

// create server object
process.mono = new EventEmitter();
process.mono.config = config;

// create caches
process.mono.cache = {
    client: Cache(),
    instances: Cache()
};

// error handling
process.mono.error = require(config.paths.LIB_ROOT + 'error');

// static file servers
process.mono.file = {
    client: new Static.Server(config.paths.CLIENT_ROOT, {cache: 604800}),
    module: new Static.Server(config.paths.MODULE_ROOT, {cache: 604800}),
    app: new Static.Server(config.paths.APPLICATION_ROOT, {cache: 604800}),
    public: new Static.Server(config.paths.PUBLIC_ROOT, {cache: 604800})
};

// init session api
process.mono.session = require(config.paths.SERVER_ROOT + 'session');

// database access
var dbs = require(config.paths.SERVER_ROOT + 'dbs');
dbs(process.mono.config, function(err, dbs) {

    // terminate process on error
    if (err) {
        throw new Error(err);
    }
    
    // add dbs to api
    process.mono.db = dbs;

    // init core server module
    require('./moduleInstance').core();
    
    // emit api ready
    process.mono.emit('ready', Server);
});
