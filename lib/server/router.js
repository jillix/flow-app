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
