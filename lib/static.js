var gzip = require('zlib').gzip;
var url = require('url');
var testSuffix = /\.[a-zA-Z0-9]+$/;

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
 * Send the index document or the requeted public file.
 *
 * @public
 * @param {array} The url paht splitted into an array.
 * @param {object} The http request object.
 * @param {object} The http respone object.
 */
exports.public = function (pathname, req, res) {
    var self = this;

    // load client, if path has no suffix
    if (!testSuffix.test(pathname)) {
        return sendClient(res, req._sidInvalid);
    }

    engine.file.get(engine.paths.app_public, pathname.substr(1), function (err, file) {

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
 * Send the index document to the client.
 *
 * @private
 * @param {object} The http response object.
 * @param {boolean} Remove session if true.
 */
function sendClient (res, removeSid) {

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
    engine.file.addFingerprints(engine.root + 'lib/client/', ['engine.js', 'flow.js', 'utils.js',  'link.js'], function (err, files) {

        // send the error in the browser
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end(err.toString());
            return;
        }

        // load engine client in a browser
        var script = '<script src="/' + engine.operation_id + '/' + engine.operation_id + '/' + engine.operation_id + '/' + files[0] + '"></script>';

        // load the core engine modules
        script += '<script>E.load([';
        for (var i = 1; i < files.length; ++i) {
            script += '"' + engine.operation_id + '/' + files[i] + '"' + (i == files.length -1 ? '' : ',');
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
    }, {prependPath: engine.operation_id + '/'});
}

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

        // save compressed/compiled script in cache and send it to the client
        engine.file.get(
            engine.root + 'lib/client/',
            link.path[1],
            function (err, script) {

                if (err) {
                    link.headers = {'content-type': 'text/plain'};
                    link.end(404, err.toString());
                    return;
                }

                link.headers = script.http;
                link.end(200, script.data);
            },
            {prependPath: engine.operation_id + '/'}
        );

        return;
    }

    // get module composition
    var modulePackage = engine.modules.get(link.path[0]);

    // check if module exists
    if (!modulePackage || !modulePackage.components) {
        link.headers = {'content-type': 'text/plain'};
        return link.end(404, 'File not found.');
    }

    // save compressed/compiled script in cache and send it to the client
    engine.file.get(

        // parent direcotry
        modulePackage._base,

        // create absolute file path
        link.path.slice(1).join('/'),

        // callback
        function (err, script) {

            if (err) {
                link.headers = {'content-type': 'text/plain'};
                return link.end(404, err.toString());
            }

            link.headers = script.http;
            link.end(200, script.data);
        },
        {
            // pass an array of allowed files
            allowedFiles: modulePackage.components.scripts,

            // prepend module path to the requested file
            prependPath: link.path[0] + '/'
        }
    );
}

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

        // send html snippet to client
        engine.file.get(
            engine.paths.app_markup, path,
            function (err, snippet) {

                if (err || !snippet && !snippet.data) {
                    err = err|| 'HTML snippet not found.';
                    console.error('lib/static.js#229', err.toString());
                    return link.send(err);
                }

                link.send(err, [snippet.path, snippet.data.toString('utf8')]);
            },
            {noCompression: true}
        );
    });
}
