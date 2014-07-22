var env = process.env;
var gzip = require('zlib').gzip;
var cache = require(env.Z_PATH_CACHE + 'cache');
var client;
var libs;
var resHeaders = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip'
};

var publicCache = cache('public');

// get libs array
if (env.Z_LIBS) {
    libs = JSON.parse(env.Z_LIBS);
}

function sendClient (res) {

    if (client) {
        res.writeHead(200, resHeaders);
        return res.end(client);
    }

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
            "<script src='/" + env.Z_OP_KEY + "/" + env.Z_CORE_INST + "/client/Z.js'></script>" +
        "</body></html>",
        function (err, data) {

            client = data;
            resHeaders['Content-Length'] = client.length;
            res.writeHead(200, resHeaders);
            res.end(client);
        }
    );
}

function route (pathname, req, res) {
    var self = this;

    // send client
    if (pathname === '/') {
        return sendClient(res);
    }

    var headers = {
        'Cache-Control': 'public, max-age=31536000',
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'gzip'
    };

    pathname = env.Z_PATH_PROCESS_PUBLIC + pathname;

    var file = publicCache.get(pathname);
    if (file) {
        headers['Content-Length'] = file.data.length;
        headers['Last-Modified'] = file.stats.mtime;
        headers['Content-Type']= file.mime;
        res.writeHead(200, headers);
        return res.end(file.data);
    }

    publicCache.save(pathname, function (err, file) {

        if (err) {
            return sendClient(res);
        }

        headers['Content-Length'] = file.data.length;
        headers['Last-Modified'] = file.stats.mtime;
        headers['Content-Type']= file.mime;
        res.writeHead(200, headers);
        res.end(file.data);
    });
}

module.exports = route;
