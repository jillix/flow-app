var gzip = require('zlib').gzip;
var url = require('url');
var testSuffix = /\.[a-zA-Z0-9]+$/;
var wrabbit = require("wrabbit");

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
 * Handle public files.
 *
 * @public
 * @param {array} The url paht splitted into an array.
 * @param {object} The http request object.
 * @param {object} The http respone object.
 */
exports.public = function (pathname, req, res) {
    var self = this;

    engine.file.get(pathname, function (err, file) {

        if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end('File "' + pathname + '" not found.');
            return;
        }

        res.writeHead(200, file.http);
        res.end(file.data);
    });
};

/**
 * Proxy an external script and append the engine wrapping code.
 *
 * @public
 * @param {object} The link object.
 */
exports.externalFile = function (link) {
    var url = link.path.join('/');
    wrabbit.wrapUrl(url, link.query.w === "1" ? "E('" + url + "', function (require, module, exports, global, engine) {" : "", function (err, res) {
        if (err) {
            link.res.writeHead(res);
            return link.res.end(err);
        }

        link.res.writeHead(200, {
            "Content-type": "application/javascript"
        });
        link.res.end(res);
    });
};

/**
 * Send the index document to the client.
 *
 * @private
 * @param {object} The http response object.
 * @param {boolean} Remove session if true.
 */
exports.client = function (pathname, req, res) {

    var removeSid = req._sidInvalid;

    // remove sid
    if (removeSid) {
        resHeaders['Set-Cookie'] = 'sid=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } else if (resHeaders['Set-Cookie']) {
        delete resHeaders['Set-Cookie'];
    }

    if (client) {
        res.writeHead(200, resHeaders);
        return res.end(client);
    }

    // get the engine client and core modules paths with fingerprints
    // TODO combine the client files in production mode
    var loadContext = {
        _id: engine.operation_id,
        _base: engine.root + 'lib/client/',
        components: {
            scripts: ['engine.js', 'flow.js', 'utils.js',  'link.js']
        }
    };

    engine.file.prepareComponents(loadContext, function (err, files) {

        // send the error in the browser
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end(err.toString());
            return;
        }

        // get script files array
        files = files.components.scripts;

        // load engine client in a browser
        var script = '<script src="/' + engine.operation_id + '/' + engine.operation_id + '/' + files[0] + '"></script>';

        // load the core engine modules
        script += '<script>E.load([';

        for (var i = 1; i < files.length; ++i) {
            script += '"' + files[i] + '"' + (i == files.length -1 ? '' : ',');
        }

        script += '],E,E.listen)</script>';

        // zip and send index document
        gzip(
            '<!DOCTYPE html><html><head>' +
                '<meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes">' +
                '<link rel="icon" href="/favicon.ico"/>' +
                script +
            '</head><body></body></html>',
            function (err, data) {

                client = data;
                resHeaders['Content-Length'] = client.length;

                resHeaders['Last-Modified'] = new Date().toString();

                res.writeHead(200, resHeaders);
                res.end(client);
            }
        );
    });
};

/**
 * Get the client side module and engine scripts.
 *
 * @public
 * @param {object} The link object.
 */
exports.moduleFile = function (link) {
    var self = this;

    // the module name must be almost alphanumeric
    if (link.pathname.replace(/[^a-z0-9\/\.\-_@\|]|\.\.\//gi, '') !== link.pathname) {
        link.headers = {'content-type': 'text/plain'};
        return link.end(400, 'Incorrect data in module request URL');
    }

    // get client engine files
    if (link.path[0] === engine.operation_id) {

        var file = {
            path: link.path[1],
            base: engine.root + 'lib/client/'
        };

        if (link.path[0] !== 'engine.js') {
            file.wrap = engine.operation_id + '/' + link.path[1];
        }

        // save compressed/compiled script in cache and send it to the client
        engine.file.get(file, function (err, script) {

            if (err) {
                link.headers = {'content-type': 'text/plain'};
                link.end(404, err.toString());
                return;
            }

            link.headers = script.http;
            link.end(200, script.data);
        });

        return;
    }

    // get module package
    var modulePackage = engine.modules.get(link.path[0]);

    // check if module exists
    if (!modulePackage || !modulePackage.components) {
        link.headers = {'content-type': 'text/plain'};
        return link.end(404, 'File not found.');
    }

    var file = {
        path: link.path.slice(1).join('/'),
        base: modulePackage._base,
        wrap: link.path[0] + '/'
    };

    // get files for access ceck
    var files;
    switch (link.pathname.split('.').pop()) {
        case 'js':
            files = modulePackage.components.scripts;
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
            link.headers = {'content-type': 'text/plain'};
            return link.end(403, 'Forbidden to access, this file is.');
        }
    }

    // save compressed/compiled script in cache and send it to the client
    engine.file.get(file, function (err, script) {

        if (err) {
            link.headers = {'content-type': 'text/plain'};
            return link.end(404, err.toString());
        }

        link.headers = script.http;
        link.end(200, script.data);
    });
};

/**
 * Get a HTML snippet.
 *
 * @public
 * @param {object} The link object.
 */
exports.markup = function (link) {
    var self = this;

    link.data(function (err, path) {

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
            var modulePackage = engine.modules.get(moduleId);

            // read the file from module base
            if (!modulePackage) {
                err = 'No module package found for module: ' + moduleId;
                console.error('lib/static.js#221', err.toString());
                return link.send(err);
            }

            // set base dir to module base
            file.base = modulePackage._base;
        }

        // send html snippet to client
        engine.file.get(file, function (err, file) {

            if (err || !file && !file.data) {
                err = err|| 'HTML snippet not found.';
                console.error('lib/static.js#229', err.toString());
                return link.send(err);
            }

            link.send(err, [file.ext, file.data.toString('utf8')]);
        });
    });
}
