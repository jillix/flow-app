var url = require('url');
var gzip = require('zlib').gzip;
var wrabbit = require('wrabbit');
var File = require('./file');
var Cache = require('./cache');
var Composition = require('./composition');
var moduleCache = Cache('modules');
var reqBuffer = [];

// the index client
var client;

// index document http headers
var resHeaders = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip',
    'Server': 'JCES'
};
var defaultHeaders = {'content-type': 'text/plain; charset=utf-8'};

/**
 * Send the index document to the client.
 *
 * @private
 * @param {object} The http response object.
 * @param {boolean} Remove session if true.
 */
exports.client = function (stream) {

    var http = stream.context;

    // remove sid
    if (http && http.req && http.req._sidInvalid) {
        resHeaders['Set-Cookie'] = 'sid=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } else if (resHeaders['Set-Cookie']) {
        delete resHeaders['Set-Cookie'];
    }

    if (client) {
        return stream.end(200, resHeaders, client);
    }

    // buffer request if client is loading
    if (client === null) {
        return reqBuffer.push(stream);
    }

    // set client loading mode
    client = null;

    // get the engine client and core modules paths with fingerprints
    var loadContext = {
        module: engine.operation_id,
        base: engine.root + 'lib/client/',
        scripts: [
            'engine.js',
            'instance.js',
            'flow.js',
            'transform.js',
            'socket.js',
            'stream.js',
            'utils.js',
            'resource.js'
        ]
    };

    // load logger module in dev mode
    if (!engine.production) {
        loadContext.scripts.splice(-2, 0, 'logs.js');
    }

    File.prepare(loadContext, function (err, files) {

        // send the error in the browser
        if (err) {
            return clientResponse(stream, defaultHeaders, 500, err.toString());
        }

        // get script files array
        files = files.scripts;

        var script = '';

        // load single files for better debugging
        // var i = length - 1, url, cleanPath; i >= 0; --i
        for (var i = (files.length - 1); i >= 0; --i) {
            script += '<script src="/' + engine.operation_id + '/' + engine.operation_id + '/' + files[i] + '"></script>';
        }

        // compress client
        gzip(
            '<!DOCTYPE html><html><head>' +
                '<meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes">' +
                '<link rel="icon" href="/!/favicon.ico"/>' +
                script +
            '</head><body></body></html>',
            function (err, data) {

                // send the error in the browser
                if (err) {
                    engine.log('E', err);
                    return clientResponse(stream, 500, defaultHeaders, err.toString());
                }

                client = data;
                resHeaders['Content-Length'] = client.length;

                clientResponse(stream, 200, resHeaders, client);
            }
        );
    });
};

function clientResponse (stream, code, headers, data) {

    // send to buffered requests
    if (reqBuffer.length) {
        for (var rb = 0; rb < reqBuffer.length; rb++) {
            reqBuffer[rb].end(code, headers, data);
        }
        reqBuffer = [];
    }

    // send client
    stream.end(code, headers, data);
}

/**
 * Handle public files.
 *
 * @public
 * @param {object} The stream object.
 */
exports.public = function (stream) {
    var http = stream.context;

    // TODO stream file
    File.get({
        path: http.pathname,
        wrap: http.query.w,
        base: engine.paths.app_public

    }, function (err, file) {

        if (err) {
            stream.end(404, defaultHeaders, 'File "' + http.pathname + '" not found.');
            return;
        }

        stream.end(200, file.http, file.data);
    });
};

/**
 * Proxy an external script and append the engine wrapping code.
 *
 * @public
 * @param {object} The link object.
 */
exports.wrap = function (stream) {
    var http = stream.context;
    var url = http.path.join('/');
    wrabbit.stream(url, http.query.w === "1" ? "E('" + url + "', function (require, module, exports, global, engine) {" : "", http.res);
};

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
 * Get the client side module and engine scripts.
 *
 * @public
 * @param {object} The link object.
 */
exports.file = function (stream) {
    var http = stream.context;

    // the module name must be almost alphanumeric
    if (http.pathname.replace(/[^a-z0-9\/\.\-_@\|]|\.\.\//gi, '') !== http.pathname) {
        return stream.end(400, defaultHeaders, 'Incorrect data in module request URL');
    }

    // create file descriptor form request
    var file;
    if (!(file = createModuleFileDescriptor(http))) {
        return stream.end(404, defaultHeaders, 'File not found. TODO: look in public folder for requested file.');
    }

    // TODO stream file
    File.get(file, function (err, script) {

        if (err) {
            return stream.end(404, defaultHeaders, err.toString());
        }

        stream.end(200, script.http, script.data);
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
