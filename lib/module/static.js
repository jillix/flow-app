var url = require('url');
var gzip = require('zlib').gzip;
var wrabbit = require('wrabbit');
var File = require('./file');
var Cache = require('./cache');
var Composition = require('./composition');
var moduleCache = Cache('modules');
var reqBuffer = [];

/**
 * Load an module instance over websoockets.
 *
 * @public
 * @param {object} The link object.
 */
exports.composition = function (stream) {
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
};


/**
 * Get a HTML snippet.
 *
 * @public
 * @param {object} The link object.
 */
exports.markup = function (stream) {
    var self = this;

    stream.data(function (stream, options, path) {

        var file = {
            path: path,
            base: engine.paths.app_markup,
            noCompression: true
        };

        // get markup form a module
        if (path[0] !== '/') {

            // create file descriptor form request
            if (
                !(file = createModuleFileDescriptor({
                    pathname: path,
                    path: path.split('/')
                }))
            ) {
                return stream.end(defaultHeaders, 'File not found.');
            }
        }

        // send html snippet to client
        File.get(file, function (err, file) {

            if (err || !file && !file.data) {
                err = err|| 'HTML snippet not found.';
                return stream.write(err);
            }

            stream.write(err, [file.ext, file.data.toString('utf8')]);
        });
    });
};

function createModuleFileDescriptor (request) {

    // create file descriptor
    var file = {
        ext:  request.pathname,
        path: request.path.slice(1).join('/'),
        wrap: request.query.w === '1' ? true : false,
        module: request.path[0]
    };

    // handle core engine files
    if (file.module === engine.operation_id) {
        file.base = engine.root + 'lib/client/';
        return file;
    }

    // get module package
    var modulePackage;
    if (!(modulePackage = moduleCache.get(file.module))) {
        return;
    }

    // check if module package has a base and client resources
    if (
        !modulePackage._base ||
        !modulePackage.composition ||
        !modulePackage.composition.client ||
        (
            !modulePackage.composition.client.module &&
            !modulePackage.composition.client.styles &&
            !modulePackage.composition.client.markup
        )
    ) {
        return;
    }

    // set base on file descriptor
    file.base = modulePackage._base;

    // check if requested file is in the module client resources
    var i, l, path;

    // script
    if (modulePackage.composition.client.module) {
        for (i = 0, l = modulePackage.composition.client.module.length; i < l; ++i) {
            path = modulePackage.composition.client.module[i];
            if ((path.indexOf('(') === 0 ? path.substr(3) : path) === file.ext) {
                return file;
            }
        }
    }

    // styles
    if (modulePackage.composition.client.styles) {
        for (i = 0, l = modulePackage.composition.client.styles.length; i < l; ++i) {
            if (modulePackage.composition.client.styles[i] === file.ext) {
                return file;
            }
        }
    }

    //markup
    if (modulePackage.composition.client.markup) {
        for (i = 0, l = modulePackage.composition.client.markup.length; i < l; ++i) {
            if (modulePackage.composition.client.markup[i] === file.ext) {
                return file;
            }
        }
    }
}
