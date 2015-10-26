var Flow = require('./flow/flow');
var bunyan = require('bunyan');
var cache = require('./cache');
var socket = require('./socket');
var Composition = require('./composition');

module.exports = function factory (config) {

    Flow({
        module: function loadModule (name, callback) {
            process.nextTick(callback, null, require(name));
        },
        composition: composition,
        markup: markup,
        styles: styles,
        cache: cache,
        log: bunyan,
        config: config
    });

    return {

        // parse request and link it to a flow event stream
        request: function (req, res) {

            // link request to flow event
            Flow.link(req.params.instance, req.params.event, req, res);

            res.end('Flow emit: ' + req.params.instance + '/' + req.params.event);
        },

        // parse message and link it to a flow event stream
        message: socket.message
    };
};

function styles (stream, options) {

}

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
