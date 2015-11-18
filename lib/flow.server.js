var Flow = require('./flow/flow');
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

            if (composition.module !== 'string') {
                composition.module = this.config.paths.public + composition.module.main;
            }

            callback(null, composition);
        },

        request: socket.request,
        config: config,
        clientComposition: composition,
        // TODO maybe there's a better way to provide a core flow config
        _flow: {
            'C': [[':clientComposition']]
        }
    }));
};

function composition (options, name, next) {

    name = name.toString();

    // handle entrypoinut
    if (name === '*') {
        var host = '';//instance = socket.upgradeReq.headers.host.split(':')[0];
        var entrypoints = this.config.entrypoints[options.session.role ? 'private' : 'public'];

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
