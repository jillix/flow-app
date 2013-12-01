var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Pongo = require('pongo');

// create api object
var API = new EventEmitter();
API.config = require('./config');

// server api
API.server = {};

// connect to db
new Pongo({
    host: API.config.dbHost,
    port: API.config.dbPort,
    // open 3 sockets to the db server per appliation process
    server: {poolSize: 3},
    db: {w: 0}
}).connect('mono', function (err, db) {
    
    if (err) {
        return API.emit('error', err);
    }
    
    // get mongodb collections
    // API.db.collectionName = db.collection('collectionName');
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
