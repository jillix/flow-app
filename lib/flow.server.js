var Flow = require('./flow/flow');
var bunyan = require('bunyan');
var cache = require('./cache');
var socket = require('./socket');

module.exports = function factory (config) {

    return socket.incoming(Flow({

        module: function loadModule (name, callback) {
            try {
                name = name[0] === '/' ? name : config.paths.module + '/' + name;
                var module = require(name);
            } catch (err) {
                return callback(err);
            }

            callback(null, module);
        },

        composition: function (name, callback) {
            try {
                var composition = require(this.config.paths.composition + '/' + name + '.json');
            } catch (err) {
                return callback(err);
            }

            callback(null, composition);
        },

        request: socket.request,
        cache: cache,
        log: bunyan,
        config: config,
        
        testDH: function (next, options, data) {
            console.log('TEST DATA HANDLER:', data, options);
            next(null, data);
        },
        testEH: function (next, options, error) {
            console.log('TEST ERROR HANDLER:', error, options);
            next(error);
        },
        testSH: function (stream, options) {
            console.log('TEST STREAM HANDLER:', options);
            // create r/w or duplex streams
            // return the stream
        },
 
        clientComposition: composition,
        // TODO maybe there's a better way to provide a core flow config
        _flow: {
            'C': [[':clientComposition']]
        }
    }));
};

function composition (next, options, name) {

    name = name.toString();

    // handle entrypoinut
    if (name === '*') {
        var host = '';//instance = socket.upgradeReq.headers.host.split(':')[0];
        var entrypoints = this.config.entrypoints[options.session ? 'private' : 'public'];

        // TODO maybe entrypoints can have simple routing..
        name = entrypoints[host] || entrypoints['*']; 
    }

    if (!name) {
        return next(new Error('Flow.server.composition: No name.'));
    }

    try {
        var composition = require(this.config.paths.composition + '/' + name + '.json');
    } catch (err) {
        return next(err);
    }

    if (!composition.module) {
        return next(new Error('Flow.server.composition: No module field on instance "' + name  + '".'));
    }

    // handle custom modules
    if (typeof composition.module !== 'string') {
        composition.module = composition.module.browser || composition.module.main;
    } else {
        composition.module = composition.module;
    }

    next(null, JSON.stringify(composition));
}
