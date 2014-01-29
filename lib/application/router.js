var gzip = require('zlib').gzip;
var M = process.mono;
var client;
var resHeaders = {
    'content-type': 'text/html; charset=utf-8',
    'access-control-allow-origin': 'http://jipics.net',
    'content-encoding': 'gzip'
};

function sendClient (res) {
    
    if (client) {
        res.writeHead(200, resHeaders);
        return res.end(client);
    }
    
    var libs = '';
    if (M.config.lib) {
        for (var i = 0; i < M.config.lib.length; ++i) {
            libs += "<script src='" + M.config.lib[i] + "'></script>\n'";
        }
    }
    
    gzip(
        "<!DOCTYPE html><html><head>\n" +
            "<link rel='icon' href='/favicon.ico'/>\n" +
            "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>\n" +
            "<meta http-equiv='X-UA-Compatible' content='IE=edge'>\n" +
            "<!--[if lt IE 10]>\n" +
                "<script src='/" + M.config.coreKey + "/" + M.config.coreMiid + "/client/IE9.js'></script>\n" +
                "<script src='/" + M.config.coreKey + "/" + M.config.coreMiid + "/client/ifYouSeeThisScriptUpdateYourBrowserNow.js'></script>\n" +
                "<script src='/" + M.config.coreKey + "/" + M.config.coreMiid + "/client/html5shiv.js'></script>\n" +
            "<![endif]-->\n" +
            libs +
            "<script src='/" + M.config.coreKey + "/" + M.config.coreMiid + "/client/M.js'></script>\n" +
            "<script type='text/javascript'>M('" + M.config.startMiid + "')</script>\n" +
        "</head><body></body></html>",
        function (err, data) {
            
            client = data;
            resHeaders['content-length'] = client.length;
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
    
    // file server
    M.file.public.serve(req, res, function (err) {
        if (err) {
            // send client when file don't exists
            sendClient(res);
        }
    });
}

module.exports = route;
