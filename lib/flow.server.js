var Flow = require('flow');
var ws = require('./websocket.js');
var http = require('./http.js');
var isJSFile = /\.js$/;

module.exports = function factory (config) {
    return Flow({

        mod: function loadModule (name, callback) {

            try {
                var module = require(name[0] === '/' ? this.config.paths.custom + name : name);
            } catch (err) {
                return callback(err);
            }

            callback(null, module);
        },

        mic: function (name, callback) {

            try {
                var composition = require(this.config.paths.composition + '/' + name + '.json');
            } catch (err) {
                return callback(err);
            }

            callback(null, composition);
        },

        net: function (instance, options) {
            return options.net === 'http' ? http.request(options) : ws.mux(instance, options);
        },

        // Empties all caches and reloads the modules.
        reset: function () {
            socket.reset();
            CoreInst.reset();
            CoreInst.load();
        },
        config: config,
        clientComposition: composition,
        _flow: {
            'C': {"d":[':clientComposition']}
        }
    });
};

function composition (options, name, next) {

    name = name.toString();

    // handle entrypoint
    if (name === '*') {
        // TODO get real host name. and find a way to handle multidomain apps
        //      with the infrastructure api
        var host = '';// = socket.upgradeReq.headers.host.split(':')[0];
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

    var module = composition.browser || composition.module;
    if (!module) {
        return next(new Error('Flow.server.composition: No module field on instance "' + name  + '".'));
    }

    // handle custom modules
    if (
        module[0] === '/' &&
        isJSFile.test(module)
    ) {
        // create client path
        (module = module.split('/')).pop();
        composition.module = module.join('/');
    } 

    next(null, JSON.stringify(composition));
}

