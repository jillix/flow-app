var gzip = require('zlib').gzip;
var serve = require("./operations/static").getFile;

// cache compressed client
var clientCache = {};

function sendClient (link, miid) {
    
    // set headers
    link.res.headers["content-type"] = "text/html; charset=utf-8";
    link.res.headers["access-control-allow-origin"] = 'http://jipics.net';
    link.res.headers['content-encoding'] = 'gzip';
    
    if (clientCache[miid]) {
        link.res.headers['content-length'] = clientCache[miid].length;
        return link.send(200, clientCache[miid]);
    }
    
    gzip(
        "<!DOCTYPE html><html><head>" +
            (M.config.app.title ? "<title>" + M.config.app.title + "</title>" : "")  +
            "<link rel='icon' href='" + (M.config.app.favicon || "/favicon.ico") + "'/>" +
            "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" +
            "<!--[if lt IE 10]>" +
                "<script src='/" + M.config.operationKey + "/core/getClient/IE9.js'></script>" +
                "<script src='/" + M.config.operationKey + "/core/getClient/ifYouSeeThisScriptUpdateYourBrowserNow.js'></script>" +
            "<![endif]-->" +
            "<script type='text/javascript'>" +
                "window.onload=function(){M('body','" + miid + "')}" +
            "</script>" +
            "<script src='/" + M.config.operationKey + "/core/getClient/M.js'></script>" +
        "</head><body></body></html>",
        function (err, data) {
            
            clientCache[miid] = data;
            
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
