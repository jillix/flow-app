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

var storeType = 'mongodb';
var storeConfig = {
    host: 'localhost',
    port: '27017',
    name: 'project_' + config.owner,
    user: config.owner,
    pass: config.apiKey
};

// setup store factory
//require(config.paths.LIB_ROOT + 'stores/factory')(storeType, storeConfig, function (err, store) {});

// db connection api
process.mono.store = require(config.paths.SERVER_ROOT + 'stores');

// get db clients
process.mono.store(config.store, function(err) {
    
    // terminate process on error
    if (err) {
        throw new Error(err);
    }
    
    // make a alias to the main store (former M.db.app)
    process.mono.mainStore = process.mono.stores[config.store];
    
    // init session api
    process.mono.session = require(config.paths.SERVER_ROOT + 'session');
    
    // init core server module
    require('./moduleInstance').core();
    
    // emit api ready
    process.mono.emit('ready');
});
