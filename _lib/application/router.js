var gzip = require('zlib').gzip;
var M = process.mono;

function sendClient (link, miid) {
    var self = this;
    
    // set headers
    link.res.headers["content-type"] = "text/html; charset=utf-8";
    link.res.headers["access-control-allow-origin"] = 'http://jipics.net';
    link.res.headers['content-encoding'] = 'gzip';
    
    var cached = M.cache.client.get(miid);
    if (cached) {
        link.res.headers['content-length'] = cached.length;
        return link.send(200, cached);
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
            "<script type='text/javascript'>M('body','" + miid + "')</script>\n" +
        "</head><body></body></html>",
        function (err, data) {
            
            M.cache.client.save(miid, data);
            
            link.res.headers['content-length'] = data.length;
            link.send(200, data);
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

function route (link) {
    var self = this;
    
    var module = traverse(link.pathname.replace(/\/$/, ""), M.config.routes, "");

    if (typeof module == "string") {
        
        module = module.split(":");
        
        // save locale in session
        if (module[1] && link.session._loc !== module[1]) {
            return link.session.set({_loc: module[1]}, function (err) {
                
                // TODO handle error
                link.res.headers['set-cookie'] = self.config.session.locale + '=' + module[1] + '; path=/';
                sendClient.call(self, link, module[0]); 
            });
        }
        
        sendClient.call(self, link, module[0]);
    
    } else {
        M.file.public.serve(link.req, link.res);
    }
}

module.exports = route;
