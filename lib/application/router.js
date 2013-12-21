var gzip = require('zlib').gzip;
var M = process.mono;

function sendClient (res, miid) {
    var self = this;
    
    // set headers
    res.headers["content-type"] = "text/html; charset=utf-8";
    res.headers["access-control-allow-origin"] = 'http://jipics.net';
    res.headers['content-encoding'] = 'gzip';
    
    var cached = M.cache.client.get(miid);
    if (cached) {
        res.headers['content-length'] = cached.length;
        res.writeHead(200, res.headers);
        return res.end(cached);
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
            "<script src='/" + M.config.coreKey + "/" + M.config.coreMiid + "/client/M.js'></script>\n" +
            "<script type='text/javascript'>M('" + miid + "','body')</script>\n" +
        "</head><body></body></html>",
        function (err, data) {
            
            M.cache.client.save(miid, data);
            
            res.headers['content-length'] = data.length;
            res.writeHead(200, res.headers);
            res.end(data);
        }
    );
}

/*
    borrowed logic from https://github.com/flatiron/director/blob/master/lib/director/router.js
    thanks!
*/
function traverse(path, routes, current) {

    if (path === current && typeof routes["/"] === "string") {
        return routes["/"];
    }

    for (var r in routes) {

        if (routes.hasOwnProperty(r)) {

            var exact = current + "/" + r;
            var match = path.match(new RegExp("^" + exact));
            
            if (!match) {
                continue;
            }

            if (match[0] && match[0] == path && typeof routes[r] === "string") {
                return routes[r];
            }
            
            var result = traverse(path, routes[r], exact);
            
            if (typeof result == "string") {
                return result;
            }
        }
    }
    
    return false;
}

function route (pathname, req, res) {
    var self = this;
    
    var module = traverse(pathname.replace(/\/$/, ""), M.config.routes, "");

    if (typeof module == "string") {
        
        res.headers = {};
        module = module.split(":");
        
        // set locale in http cookie
        if (module[1]) {
            res.headers['set-cookie'] = M.config.session.locale + '=' + module[1] + '; path=/';
        }
        
        sendClient.call(self, res, module[0]);
    
    } else {
        M.file.public.serve(req, res);
    }
}

module.exports = route;
