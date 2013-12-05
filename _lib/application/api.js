var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Pongo = require('pongo');

// create api object
var API = new EventEmitter();
API.config = require('./config');

//API.blend(require(API.config.paths.API_APPLICATION + 'send'));
API.blend(require(API.config.paths.API_APPLICATION + 'router'));
API.blend(require(API.config.paths.API_APPLICATION + 'module'));
//API.blend(require(API.config.paths.API_APPLICATION + 'static'));
//API.cache = require(API.config.paths.API_PUBLIC + 'static')('');
API.cache = require(API.config.paths.API_PUBLIC + 'cache')();
API.error = require(API.config.paths.API_PUBLIC + 'error');

require(API.config.paths.API_PUBLIC + 'dbs')(API.config, function(err, dbs) {

    if (err) {
        return API.emit('error', err);
    }

    API.db = dbs;

    API.emit('ready');
});

module.exports = API;

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
