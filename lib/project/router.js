var env = process.env;
var fs = require('fs');
var gzip = require('zlib').gzip;
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

                callback(null, data);
            });

        // handle no libs
        } else {
            callback();
        }
    });
}

function sendClient (res) {

    if (client) {
        res.writeHead(200, resHeaders);
        return res.end(client);
    }

    // get libs paths
    getLibs(function (err, libs) {

        var lib_src = '';
        if (libs) {
            for (var i = 0; i < libs.length; ++i) {
                lib_src += "<script src='" + libs[i] + "'></script>\n";
            }
        }

        gzip(
            "<!DOCTYPE html><html><head><link rel='icon' href='/favicon.ico'/>" +
            "</head><body>" +
                lib_src +
                "<script src='/" + env.Z_OP_KEY + "/" + env.Z_CORE_INST + "/" + env.Z_SEND_CLIENT_REQ + "/Z.js'></script>" +
            "</body></html>",
            function (err, data) {

                client = data;
                resHeaders['Content-Length'] = client.length;
                res.writeHead(200, resHeaders);
                res.end(client);
            }
        );
    });
}

function route (pathname, req, res) {
    var self = this;

    // send client
    if (pathname === '/') {
        return sendClient(res);
    }

    pathname = env.Z_PATH_PROCESS_PUBLIC + pathname;

    var file = publicCache.get(pathname);
    if (file) {
        res.writeHead(200, file.http);
        res.end(file.data);
        return;
    }

    publicCache.set(pathname, function (err, file) {

        if (err) {
            return sendClient(res);
        }

        res.writeHead(200, file.http);
        res.end(file.data);
    });
}

module.exports = route;
