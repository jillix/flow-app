var gzip = require('zlib').gzip;
var serve = require("./operations/static").getFile;

function sendClient (link, miid) {
    
    // set headers
    link.res.headers["content-type"] = "text/html; charset=utf-8";
    link.res.headers["access-control-allow-origin"] = 'http://jipics.net';
    link.res.headers['content-encoding'] = 'gzip';
    
    if (M.cache.client.cache[miid]) {
        link.res.headers['content-length'] = M.cache.client.cache[miid].length;
        return link.send(200, M.cache.client.cache[miid]);
    }
    
    gzip(
        "<!DOCTYPE html><html><head>\n" +
            (M.config.app.title ? "<title>" + M.config.app.title + "</title>\n" : "") +
            "<link rel='icon' href='" + (M.config.app.favicon || "/favicon.ico") + "'/>\n" +
            "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>\n" +
            "<meta http-equiv='X-UA-Compatible' content='IE=edge'>\n" +
            "<!--[if lt IE 10]>\n" +
                "<script src='/" + M.config.operationKey + "/core/getClient/IE9.js'></script>\n" +
                "<script src='/" + M.config.operationKey + "/core/getClient/ifYouSeeThisScriptUpdateYourBrowserNow.js'></script>\n" +
                "<script src='/" + M.config.operationKey + "/core/getClient/html5shiv.js'></script>\n" +
            "<![endif]-->\n" +
            "<script type='text/javascript'>\n" +
                "window.onload=function(){M('body','" + miid + "')}\n" +
            "</script>\n" +
            "<script src='/" + M.config.operationKey + "/core/getClient/M.js'></script>\n" +
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
};

function route(link) {
    
    var module = traverse(link.pathname.replace(/\/$/, ""), M.config.app.routes, "");

    if (typeof module == "string") {
        
        module = module.split(":");
        
        if (module[1] && link.session._loc !== module[1]) {
            return link.session.set({_loc: module[1]}, function (err) {
                // TODO handle error
                link.res.headers['set-cookie'] = M.config.session.locale + '=' + module[1] + '; path=/';
                sendClient(link, module[0]); 
            });
        }
        
        sendClient(link, module[0]);
    
    } else {
        serve(link);
    }
}

module.exports = route;
