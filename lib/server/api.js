var EventEmitter = require('events').EventEmitter;
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var Server = mongo.Server;
var config = require('./config');

// create api object
process.mono = new EventEmitter();
process.mono.config = config;
process.mono.error = require(config.paths.API_PUBLIC + 'error');
process.mono.cache = require(config.paths.API_PUBLIC + 'cache')();

// connect to db
var mongoClient = new MongoClient(new Server(config.dbHost, config.dbPort, {poolSize: 10}), {native_parser: true});
mongoClient.open(function(err, mongoClient) {
    
    if (err) {
        return process.mono.emit('error', err);
    }

    var db = mongoClient.db('mono', {w: 0});

    db.authenticate('admin', '1234', function(err, data) {

        if (err) {
            return process.mono.emit('error', err);
        }

        // save collection in app api
        process.mono.db = {
            applications: db.collection('m_applications')
        };

        process.mono.emit('ready');
    });
});

