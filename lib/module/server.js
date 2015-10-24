var FLow = require('../flow/flow');
var bunyan = require('bunyan');
var Composition = require('./composition');

Flow({
    module: function loadModule (name, callback) {
        callback(null, require(name));
    },
    composition: function (stream, options) {

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
    },
    markup: function (stream, options) {
        if (options.res && options.res.sendFile) {

            // TODO get markup from modules markup path?
            // TODO send markup snipptet from the apps public folder
            res.sendFile(/*send markup file*/);
        }
    },
    cache: function () {},
    log: bunyan,
    paths: {
        'public': global.pkg.repository.local + 'public/',
        'markup': global.pkg.repository.local + 'markup/',
        'composition': global.pkg.repository.local + 'composition/'
    }
});
