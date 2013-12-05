var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Pongo = require('pongo');
var Static = require('node-static');

// create api object
var API = new EventEmitter();
API.config = require('./config');

var Cache = require(API.config.paths.API_PUBLIC + 'cache');

//API.blend(require(API.config.paths.API_APPLICATION + 'send'));
API.blend(require(API.config.paths.API_APPLICATION + 'router'));
API.module = API.clone().blend(require(API.config.paths.API_APPLICATION + 'module'));
API.operator = API.clone().blend(require(API.config.paths.API_APPLICATION + 'operator'));
API.session = API.clone().blend(require(API.config.paths.API_APPLICATION + 'session'));
API.cache = {
    client: Cache(),
    miids: Cache()
};
API.error = require(API.config.paths.API_PUBLIC + 'error');
API.file = {
    client: new Static.Server(API.config.paths.CLIENT_ROOT, {cache: 604800}),
    module: new Static.Server(API.config.paths.MODULE_ROOT, {cache: 604800}),
    app: new Static.Server(API.config.paths.APPLICATION_ROOT, {cache: 604800})
};

require(API.config.paths.API_APPLICATION + 'dbs')(API.config, function(err, dbs) {

    if (err) {
        return API.emit('error', err);
    }

    API.db = dbs;
    API.emit('ready');
});

exports.API = API;

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
