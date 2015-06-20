var gzip = require('zlib').gzip;
var url = require('url');
var wrabbit = require("wrabbit");
var File = require('./file');
var Cache = require('./cache');
var Composition = require('./composition');

var ModuleCache = Cache('modules');

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

/**
 * Send the index document to the client.
 *
 * @private
 * @param {object} The http response object.
 * @param {boolean} Remove session if true.
 */
exports.client = function (stream) {
    
    var pathname = stream.pathname;
    var req = stream.req;
    var res = stream.res;
    
    stream.headers = resHeaders;
    
    // remove sid
    if (req._sidInvalid) {
        resHeaders['Set-Cookie'] = 'sid=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } else if (resHeaders['Set-Cookie']) {
        delete resHeaders['Set-Cookie'];
    }

    if (client) {
        return stream.end(200, client);
    }

    // get the engine client and core modules paths with fingerprints
    var loadContext = {
        _id: engine.operation_id,
        _base: engine.root + 'lib/client/',
        combine: 'client.js',
        components: {
            module: [
                'resource.js',
                'utils.js',
                'stream.js',
                'socket.js',
                'flow.js',
                'instance.js',
                'transform.js',
                'engine.js'
            ]
        }
    };

    File.prepareComponents(loadContext, function (err, files) {

        // send the error in the browser
        if (err) {
            stream.headers = {'Content-Type': 'text/plain; charset=utf-8'};
            return stream.end(500, err.toString());
        }

        // get script files array
        files = files.components.module;
        
        var script = '';
        
        // load single files for better debugging
        // TOOD combine files in production mode
        for (var i = 0; i < files.length; ++i) {
            script += '<script src="/' + engine.operation_id + '/' + engine.operation_id + '/' + files[i] + '"></script>';
        }
        
        // compress client
        gzip(
            '<!DOCTYPE html><html><head>' +
                '<meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes">' +
                '<link rel="icon" href="/favicon.ico"/>' +
                script +
            '</head><body></body></html>',
            function (err, data) {
              
                // send the error in the browser
                if (err) {
                    stream.headers = {'Content-Type': 'text/plain; charset=utf-8'};
                    return stream.end(500, err.toString());
                }
                
                client = data;
                resHeaders['Content-Length'] = client.length;
                
                // send client
                stream.end(200, client);
            }
        );
    });
};

/**
 * Handle public files.
 *
 * @public
 * @param {array} The url paht splitted into an array.
 * @param {object} The http request object.
 * @param {object} The http respone object.
 */
exports.public = function (stream) {
    var self = this;
    
    // TODO stream file
    File.get(stream.pathname, stream.query.w, function (err, file) {

        if (err) {
            stream.headers = {'Content-Type': 'text/plain; charset=utf-8'};
            stream.end(404, 'File "' + stream.pathname + '" not found.');
            return;
        }
        
        stream.headers = file.http;
        stream.end(200, file.data);
    });
};

/**
 * Proxy an external script and append the engine wrapping code.
 *
 * @public
 * @param {object} The link object.
 */
exports.wrap = function (stream) {
    var url = stream.path.join('/');
    wrabbit.stream(url, stream.query.w === "1" ? "E('" + url + "', function (require, module, exports, global, engine) {" : "", stream.res);
};

/**
 * Load an module instance over websoockets.
 *
 * @public
 * @param {object} The link object.
 */
exports.composition = function (stream) {
    var self = this;
    var role = stream.socket.session[engine.session_role];

    // receive data
    stream.data(function (err, instance) {
        
        // load entrypoint module instance with hostname
        if (!instance) {

            instance = stream.socket.upgradeReq.headers.host.split(':')[0].replace(/\./g, '_');

            // get the public version of the entrypoint module instance
            if (!role) {
                instance += '.pub';
            }
        }
        
        // get composition
        Composition(instance, role, function (err, composition) {
            
            if (err) {
                return stream.write(err.toString());
            }
            
            if (!composition.module || !composition.client || !composition.client.module) {
                return stream.write('Incomplete client composition!');
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
    var self = this;

    // the module name must be almost alphanumeric
    if (stream.pathname.replace(/[^a-z0-9\/\.\-_@\|]|\.\.\//gi, '') !== stream.pathname) {
        stream.headers = {'content-type': 'text/plain'};
        return stream.end(400, 'Incorrect data in module request URL');
    }
    
    var file;

    // get client engine files
    if (stream.path[0] === engine.operation_id) {

        file = {
            path: stream.path[1],
            base: engine.root + 'lib/client/'
        };

        if (stream.path[0] !== 'engine.js') {
            file.wrap = engine.operation_id + '/' + stream.path[1];
        }

        // save compressed/compiled script in cache and send it to the client
        File.get(file, true, function (err, script) {

            if (err) {
                stream.headers = {'content-type': 'text/plain'};
                stream.end(404, err.toString());
                return;
            }

            stream.headers = script.http;
            stream.end(200, script.data);
        });

        return;
    }

    // get module package
    var modulePackage = ModuleCache.get(stream.path[0]);

    // check if module exists
    if (!modulePackage || !modulePackage.components) {
        stream.headers = {'content-type': 'text/plain'};
        return stream.end(404, 'File not found.');
    }

    file = {
        path: stream.path.slice(1).join('/'),
        base: modulePackage._base,
        wrap: stream.path[0] + '/'
    };

    // get files for access ceck
    var files;
    switch (stream.pathname.split('.').pop()) {
        case 'js':
            files = modulePackage.components.module;
            break;
        case 'css':
            files = modulePackage.components.styles;
            break;
        case 'html':
        case 'htm':
            files = modulePackage.components.markup;
            break;
        default:
          file.base += (modulePackage.public || 'public') + '/';
    }

    // check file access
    if (files) {

        var found;
        for (var i = 0; i < files.length; ++i) {

            if (files[i] === file.wrap + file.path) {
                found = true;
                break;
            }
        }

        if (!found) {
            stream.headers = {'content-type': 'text/plain'};
            return stream.end(403, 'Forbidden to access, this file is.');
        }
    }

    // save compressed/compiled script in cache and send it to the client
    File.get(file, stream.query.w, function (err, script) {

        if (err) {
            stream.headers = {'content-type': 'text/plain'};
            return stream.end(404, err.toString());
        }

        stream.headers = script.http;
        stream.end(200, script.data);
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

    stream.data(function (err, path) {

        // ignore errors
        if (err) {
            return;
        }

        var file = {
            path: path,
            base: engine.paths.app_markup,
            noCompression: true
        };

        if (path[0] !== '/') {
            // split path and get module id
            var moduleId = (path = path.split('/')).shift();

            // create path without module id
            file.path = path.join('/');

            // get module package
            var modulePackage = ModuleCache.get(moduleId);

            // read the file from module base
            if (!modulePackage) {
                err = 'No module package found for module: ' + moduleId;
                console.error('lib/static.js#221', err.toString());
                return stream.write(err);
            }

            // set base dir to module base
            file.base = modulePackage._base;
        }

        // send html snippet to client
        File.get(file, false, function (err, file) {

            if (err || !file && !file.data) {
                err = err|| 'HTML snippet not found.';
                console.error('lib/static.js#229', err.toString());
                return stream.write(err);
            }

            stream.write(err, [file.ext, file.data.toString('utf8')]);
        });
    });
};
