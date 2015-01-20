var env = process.env;
var gzip = require('zlib').gzip;
var fingerprint = require(env.Z_PATH_UTILS + 'fingerprint');
var cache = require(env.Z_PATH_CACHE + 'cache');
var testSuffix = /\.[a-zA-Z0-9]+$/;
var client;
var resHeaders = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip',
    'Server': 'JCES'
};

var publicCache = cache.file('public', {wd: env.Z_PATH_PROCESS_PUBLIC});

module.exports = route;

function route (pathname, req, res) {
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
}

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

    // get z path with fingerprint
    fingerprint.getZ(function (err, z_path) {

        gzip(
            '<!DOCTYPE html><html><head>' +
                '<meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1.0, user-scalable=yes">' +
                '<link rel="icon" href="/favicon.ico"/>' +
                '<script src="/@/Z/Z/main.js"></script>' +
                '<script src="/@/Z/Z/socket.js"></script>' +
                '<script src="/@/Z/Z/module.js"></script>' +
                '<script src="/@/Z/Z/router.js"></script>' +
                //'<script src="' + z_path + '"></script>' +
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
function moduleFiles (event, request, callback) {
    var self = this;

    // the module name must be almost alphanumeric
    if (event.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, '') !== event.pathname) {
        event.headers = {'content-type': 'text/plain'};
        return callback(404, 'Incorrect data in module request URL');
    }

    // get module composition
    compModules.get(

        // create module name
        event.path.slice(0, 4).join('_'),

        // request user role
        event.role,

        // callback
        function (err, module) {

            // check the roles access to the module
            if (err || !module) {
                event.headers = {'content-type': 'text/plain'};
                err = err ? err.toString() : 'Module not found.';
                return callback(404, err);
            }

            // save compressed/compiled script in cache and send it to the client
            fileModule.set(

                // create absolute file path
                event.path.slice(4).join('/'),

                // callback
                function (err, script) {

                    if (err) {
                        event.headers = {'content-type': 'text/plain'};
                        return callback(404, errtoString());
                    }

                    event.headers = script.http;
                    callback(200, script.data);
                },

                // pass an array of allowed files
                module.dependencies,

                // prepend module path to the requested file
                event.path.slice(0, 4).join('/') + '/'
            );
        }
    );
}

// get mono client (http)
function _client (event, request, callback) {
    var self = this;

    // save compressed/compiled script in cache and send it to the client
    fileClient.set(event.path[0], function (err, script) {

        if (err) {
            event.headers = {'content-type': 'text/plain'};
            callback(500, err.toString());
            return;
        }

        event.headers = script.http;
        callback(200, script.data);
    });
}
