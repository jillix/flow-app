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

        // TODO maybe there's a better way to provide a core flow config
        _flow: {
            'C': [[composition]],
            'M': [[markup]]
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

function composition (stream, options) {

    var self = this;
    var socket = stream.context.socket;
    var role = socket.session[engine.session_role];

    // receive data
    stream.data(function (stream, options, instance) {

        // load entrypoint module instance with hostname
        if (!instance) {

            instance = socket.upgradeReq.headers.host.split(':')[0];

            // get the entrypoint module instance
            // TODO maybe entrypoints can have simple routing..
            var entrypoints = engine.package.entrypoints[role ? 'private' : 'public'];
            instance = entrypoints[instance] || entrypoints['*'];

            if (!instance) {
                return stream.write(
                    engine.log('E', 'Static: Composition entrypoint not found.')
                );
            }
        }

        // tell cache to remove instance on composition change
        var related = {instances: {}};
        related.instances[instance] = true;

        // get composition
        Composition(instance, related, role, function (err, composition) {

            if (err) {
                return stream.write(err.toString());
            }

            if (!composition.client) {
                return stream.write(
                    engine.log('E', 'Static: Composition "' + composition.name + '" has no client config.')
                );
            }

            // write composition to client
            stream.write(null, composition.client);
        });
    });
}
