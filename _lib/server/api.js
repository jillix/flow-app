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

// TODO create paths in config.paths for requiering modules
var cache = require('../api/public/cache');

// create api object
var API = new EventEmitter();
API.config = require('./config');

// server api
API.server = {};
API.server.merge(require('../api/server/proxy'));
API.server.merge(require('../api/server/spawner'));
API.server.merge(require('../api/server/app'));
API.server.error = require('../api/public/error');
API.server.cache = cache();

// TODO make db parameters configurable
// connect to db
new Pongo({
    //host: M.config.mongoDB.host,
    //port: M.config.mongoDB.port,
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
