var Flow = require('flow');
var ws = require('flow-ws');
var http = require('flow-http');

module.exports = function factory (config) {
    return Flow({

        mod: function loadModule (name, callback) {

            try {
                var module = require(name[0] === '/' ? config.paths.custom + name : name);
            } catch (err) {
                return callback(err);
            }

            callback(null, module);
        },

        mic: function (name, callback) {

            try {
                var composition = require(config.paths.composition + '/' + name + '.json');
            } catch (err) {
                return callback(err);
            }

            callback(null, composition);
        },

        net: function (instance, options) {

            if (options.net === 'http') {
                http.request(options);

            } else {
                ws.mux(instance, options);
            }
        },

        msg: function () {
            // emit incoming request events
            // app.use(function () {Flow.flow('url', {url: url, params, etc.})})
            // websocket.onmessage = function (msg) {Flow.flow(event, {to: instance})}
        },

        // Empties all caches and reloads the modules.
        reset: function () {
            socket.reset();
            this._reset();
            this.load();
        }
    });
};
