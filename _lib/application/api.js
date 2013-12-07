var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Pongo = require('pongo');
var Static = require('node-static');
var config = require('./config');
var Cache = require(config.paths.API_PUBLIC + 'cache');

// create server object
var Server = new EventEmitter();
Server.config = config;

// router
Server.route = require(config.paths.SERVER_ROOT + 'router');

// create miid cache
Server.miids = {};
// add core module to miid cache
Server.miids.M = require(config.paths.SERVER_ROOT + 'module');
// set core module public rights
Server.miids.M.roles = {'*': 1};

Server.session = Server.clone().blend(require(config.paths.SERVER_ROOT + 'session'));
Server.send = Server.clone().blend(require(config.paths.SERVER_ROOT + 'send'));

Server.cache = {
    client: Cache(),
    miids: Cache()
};
Server.error = require(config.paths.API_PUBLIC + 'error');
Server.file = {
    client: new Static.Server(config.paths.CLIENT_ROOT, {cache: 604800}),
    module: new Static.Server(config.paths.MODULE_ROOT, {cache: 604800}),
    app: new Static.Server(config.paths.APPLICATION_ROOT, {cache: 604800}),
    public: new Static.Server(config.paths.PUBLIC_ROOT, {cache: 604800})
};

// create user api
var User = {};
User.config = config;

require(config.paths.API_APPLICATION + 'dbs')(Server.config, function(err, dbs) {

    // terminate process on error
    if (err) {
        throw new Error(err);
    }
    
    User.db = dbs;
    Server.db = dbs;
    Server.emit('ready', Server);
});

exports.server = Server;
exports.user = User;

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
