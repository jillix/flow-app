var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var argv = require('optimist');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var Server = mongo.Server;

// create api object
var API = new EventEmitter();
API.config = require('./config');

// server api
API.server = {};
API.blend(require(API.config.paths.API_SERVER + 'proxy'));
API.blend(require(API.config.paths.API_SERVER + 'spawner'));
API.blend(require(API.config.paths.API_SERVER + 'app'));
API.error = require(API.config.paths.API_PUBLIC + 'error');
API.cache = require(API.config.paths.API_PUBLIC + 'cache')();

// connect to db
var mongoClient = new MongoClient(new Server(API.config.dbHost, API.config.dbPort, {poolSize: 10}), {native_parser: true});
mongoClient.open(function(err, mongoClient) {
    
    if (err) {
        return API.emit('error', err);
    }
    
    var db = mongoClient.db('mono', {w: 0});
    
    // save collection in app api
    API.db = {
        applications: db.collection('m_applications')
    };
    
    API.emit('ready', API);
});

module.exports = API;
