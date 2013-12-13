var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Static = require('node-static');
var config = require('./config');
var Cache = require(config.paths.API_PUBLIC + 'cache');

// create server object
process.mono = new EventEmitter();
process.mono.config = config;

// create miid cache
process.mono.miids = {};
var coreModule = new EventEmitter();
require(config.paths.SERVER_ROOT + 'module').call(coreModule);
coreModule.m_miid = 'M';

// add core module to miid cache
process.mono.miids.M = coreModule;
// set core module public rights
process.mono.miids.M.m_roles = {'*': 1};

// create caches
process.mono.cache = {
    client: Cache()
    //miids: Cache()
};

// error handling
process.mono.error = require(config.paths.API_PUBLIC + 'error');

// static file servers
process.mono.file = {
    client: new Static.Server(config.paths.CLIENT_ROOT, {cache: 604800}),
    module: new Static.Server(config.paths.MODULE_ROOT, {cache: 604800}),
    app: new Static.Server(config.paths.APPLICATION_ROOT, {cache: 604800}),
    public: new Static.Server(config.paths.PUBLIC_ROOT, {cache: 604800})
};

// database access
require(config.paths.API_APPLICATION + 'dbs')(process.mono.config, function(err, dbs) {

    // terminate process on error
    if (err) {
        throw new Error(err);
    }
    
    process.mono.db = dbs;
    process.mono.emit('ready', Server);
});

// APPLICATION LOG
//var appPath = self.config.paths.APPLICATION_ROOT + application._id;
// the application directory must be present otherwise the piped
// streams below will crash the mono proxy server
//if (!fs.existsSync(appPath)) {
//    return callback(self.error(self.error.APP_DIR_NOT_FOUND, application._id));
//}
// write to application log
//var log = fs.createWriteStream(appPath + '/log.txt');
//app.stdout.pipe(log);
//app.stderr.pipe(log);
