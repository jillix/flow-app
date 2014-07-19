var M = process.mono;
var gzip = require('zlib').gzip;
var client;
var resHeaders = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip'
};

function sendClient (res) {

    if (client) {
        res.writeHead(200, resHeaders);
        return res.end(client);
    }

    var libs = '';
    if (M.config.libs) {
        for (var i = 0; i < M.config.libs.length; ++i) {
            libs += "<script src='" + M.config.libs[i] + "'></script>\n";
        }
    }

    gzip(
        "<!DOCTYPE html><html><head><link rel='icon' href='/favicon.ico'/>" +
        "</head><body>" +
            libs +
            "<script src='/" + M.config.operationKey + "/" + M.config.coreInstance + "/client/Z.js'></script>" +
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

    pathname = M.config.paths.PUBLIC_ROOT + pathname;

    var file = M.cache.public.get(pathname);
    if (file) {
        headers['Content-Length'] = file.data.length;
        headers['Last-Modified'] = file.stats.mtime;
        headers['Content-Type']= file.mime;
        res.writeHead(200, headers);
        return res.end(file.data);
    }

    M.cache.public.save(pathname, function (err, file) {

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
