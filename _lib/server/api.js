var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var argv = require('optimist');
var Pongo = require('pongo');

// create api object
var API = new EventEmitter();
API.config = require('./config');

// server api
API.server = {};
API.merge(require(API.config.paths.API_SERVER + 'proxy'));
API.merge(require(API.config.paths.API_SERVER + 'spawner'));
API.merge(require(API.config.paths.API_SERVER + 'app'));
API.error = require(API.config.paths.API_PUBLIC + 'error');
API.cache = require(API.config.paths.API_PUBLIC + 'cache')();

// connect to db
new Pongo({
    host: API.config.dbHost,
    port: API.config.dbPort,
    server: {poolSize: 10},
    db: {w: 0}
}).connect('mono', function (err, db) {
    
    if (err) {
        return API.emit('error', err);
    }
    
    db.collection('m_applications', function (err, collection) {
        
        if (err) {
            return API.emit('error', err);
        }
        
        // save collection in app api
        API.db = {
            applications: collection
        };
        
        API.emit('ready', API);
    });
});

module.exports = API;
