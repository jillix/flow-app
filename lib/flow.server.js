var Flow = require('./flow/flow');
var bunyan = require('bunyan');
var cache = require('./cache');
var socket = require('./socket');

module.exports = function factory (config) {

    return socket.incoming(Flow({

        module: function loadModule (name, callback) {
            try {
                var module = require(config.paths.module + '/' + name);
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
        
        testDH: function (stream, options, data) {
            console.log('TEST DATA HANDLER:', data, options);
            stream.next(null, data);
        },
        testEH: function (stream, options, error) {
            console.log('TEST ERROR HANDLER:', error, options);
            stream.next(error);
        },
        testSH: function (stream, options) {
            console.log('TEST STREAM HANDLER:', options);
            // create r/w or duplex streams
            // return the stream
        },
 
        clientComposition: composition,
        clientMarkup: markup,
        // TODO maybe there's a better way to provide a core flow config
        _flow: {
            'C': {
                1: false,
                e: [
                    [':testEH', {num: 0}]
                    [':testEH', {num: 1}]
                ],
                d: [
                    [':testDH', {num: 0}],
                    ['|testSH', {leak: false, objectMode: false}],
                    ['.testDH', {num: 1}],
                    ['>testSH', {leak: false}],
                    ['*testSH', {leak: false}],
                    ':clientComposition',
                ]
            },
            'M': {
                e: [
                    ':testEH',
                    '>testSH',
                    ':testEH'
                ],
                d: [
                    ':clientMarkup',
                ]

            }
        }
    }));
};

function markup (stream, options) {

    // TODO just use the stream and send the read file
    if (options.res && options.res.sendFile) {

        // TODO get markup from modules markup path?
        // TODO send markup snipptet from the apps public folder
        res.sendFile(config.paths.markup + '/'/*send markup file*/);
    }
}

function composition (stream, options, name) {

    name = name.toString();

    // handle entrypoint
    if (name === '*') {
        var host = '';//instance = socket.upgradeReq.headers.host.split(':')[0];
        var entrypoints = this.config.entrypoints[stream.session.role ? 'private' : 'public'];

        // TODO maybe entrypoints can have simple routing..
        name = entrypoints[host] || entrypoints['*']; 
    }

    if (!name) {
        return stream.end(new Error('Flow.server.composition: No name.'));
    }

    try {
        var composition = require(this.config.paths.composition + '/' + name + '.json');
    } catch (err) {
        return stream.end(err);
    }

    if (!composition.client) {
        return stream.end(new Error('Flow.server.composition: No client config.'));
    }

    composition.client.module = composition.module;

    stream.end(null, JSON.stringify(composition.client));
}
