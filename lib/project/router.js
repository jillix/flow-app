var env = process.env;
var fs = require('fs');
var gzip = require('zlib').gzip;
var fingerprint = require(env.Z_PATH_UTILS + 'fingerprint');
var cache = require(env.Z_PATH_CACHE + 'cache');
var client;
var resHeaders = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip'
};

var publicCache = cache.file('public');

// get libs array
function getLibs (callback) {
    fs.exists(env.Z_CLIENT_LIBS, function (exists) {
        if (exists) {
            fs.readFile(env.Z_CLIENT_LIBS, function (err, data) {

                if (err) {
                    return callback(err);
                }

                // parse json file and save object in cache
                try {
                    data = JSON.parse(data);
                } catch (err) {
                    return callback(err);
                }

                fingerprint.addToFiles(env.Z_CORE_INST, data, callback);
            });

        // handle no libs
        } else {
            callback(null, []);
        }
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

    // get libs paths
    getLibs(function (err, libs) {

        if (err) {
            res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end(err.toString());
        }

        // get z path with fingerprint
        fingerprint.getZ(function (err, z_path) {

            // add z file to the libs array
            libs.push(z_path);

            var lib_src = '';
            if (libs) {
                for (var i = 0; i < libs.length; ++i) {
                    lib_src += '<script src="' + libs[i] + '"></script>';
                }
            }

            gzip(
                '<!DOCTYPE html><html><head><link rel="icon" href="/favicon.ico"/>' +
                '</head><body>' + lib_src + '</body></html>',
                function (err, data) {

                    client = data;
                    resHeaders['Content-Length'] = client.length;
                    res.writeHead(200, resHeaders);
                    res.end(client);
                }
            );
        });
    });
}

function route (pathname, req, res) {
    var self = this;

    // send client
    if (pathname === '/') {
        return sendClient(res, req._sidInvalid);
    }

    publicCache.set(env.Z_PATH_PROCESS_PUBLIC + pathname, function (err, file) {

        if (err) {
            return sendClient(res, req._sidInvalid);
        }

        res.writeHead(200, file.http);
        res.end(file.data);
    });
}

module.exports = route;
