// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

// object with a merge function
Object.defineProperty(Object.prototype, "merge", {
    value: function(object, overwrite){
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                if (!overwrite && typeof this[property] !== 'undefined') {
                    continue;
                }
                
                this[property] = object[property];
            }
        }
    }
});

var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var argv = require('optimist');
var Pongo = require('pongo');

// create api object
var API = new EventEmitter();
API.config = require('./config');

// server api
API.server = {};
API.server.merge(require(API.config.paths.API_SERVER + 'proxy'));
API.server.merge(require(API.config.paths.API_SERVER + 'spawner'));
API.server.merge(require(API.config.paths.API_SERVER + 'app'));
API.server.error = require(API.config.paths.API_PUBLIC + 'error');
API.server.cache = require(API.config.paths.API_PUBLIC + 'cache')();

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
        API.server.collection = collection;
        API.emit('ready', API);
    });
});

module.exports = API;
