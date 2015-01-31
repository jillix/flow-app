var gzip = require('zlib').gzip;
var url = require('url');
var fingerprint = require('./fingerprint');
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

// create file caches
var publicCache = engine.cache.file('public', {wd: engine.repo + 'public/'});
var fileClient = engine.cache.file('client', {wd: engine.root + 'lib/client/'});
var fileModule = engine.cache.file('module', {wd: engine.paths.app_modules});

// create a composition cache
var moduleInstanceCache = engine.cache.comp('moduleInstances');

// listen to the script core event
engine.on('script', getScript);

/**
 * Send the index document or the requeted public file.
 *
 * @public
 * @param {array} The url paht splitted into an array.
 * @param {object} The http request object.
 * @param {object} The http respone object.
 */
module.exports = function (pathname, req, res) {
    var self = this;

    // send client
    if (pathname === '/') {
        return sendClient(res, req._sidInvalid);
    }

    publicCache.set(pathname, function (err, file) {

        if (err) {

            // return not found if path has a suffix
            if (testSuffix.test(pathname)) {

                res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
                res.end('File "' + pathname + '" not found.');

                return;
            }

            // send client
            return sendClient(res, req._sidInvalid);
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
    fingerprint.addToFiles(null, ['engine.js', 'flow.js', 'utils.js',  'link.js'], function (err, files) {

        // send the error in the browser
        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end(err.toString());
            return;
        }

        // load engine client in a browser
        var script = '<script src="/@/0/script/E/' + files[0] + '"></script>';

        // load the core engine modules
        script += '<script>E.load("E",[';
        for (var i = 1; i < files.length; ++i) {
            script += '"./' + files[i] + '"' + (i == files.length -1 ? '' : ',');
        }
        script += '],E.listen)</script>';

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
}

// load client module files (http)
/**
 * Get the client side module and engine scripts.
 *
 * @public
 * @param {object} The link object.
 */
function getScript (link) {
    var self = this;

    // the module name must be almost alphanumeric
    if (link.pathname.replace(/[^a-z0-9\/\.\-_@\|]|\.\.\//gi, '') !== link.pathname) {
        link.headers = {'content-type': 'text/plain'};
        return link.end(400, 'Incorrect data in module request URL');
    }

    // get client engine files
    if (link.path[0] === 'E') {

        // save compressed/compiled script in cache and send it to the client
        fileClient.set(
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
            null,
            'E/'
        );

        return;
    }

    // get module composition
    var module = moduleInstanceCache._modules[link.path[0]];

    // check if module exists
    if (!module || !module.clientDependencies) {
        link.headers = {'content-type': 'text/plain'};
        return link.end(404, 'File not found.');
    }

    // save compressed/compiled script in cache and send it to the client
    fileModule.set(

        // create absolute file path
        link.path[1],

        // callback
        function (err, script) {

            if (err) {
                link.headers = {'content-type': 'text/plain'};
                return link.end(404, err.toString());
            }

            link.headers = script.http;
            link.end(200, script.data);
        },

        // pass an array of allowed files
        module.clientDependencies,

        // prepend module path to the requested file
        link.path[0] + '/'
    );
}
