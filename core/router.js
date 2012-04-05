var send = require(CONFIG.root + "/core/send").send;

var Nscript = CONFIG.clientLibrary + (CONFIG.dev ? ".dev" : "");

// TODO: get routing tables from db (mongodb) 
var table = {
    
    "/": 0,
    "stdl": 1,
    "users": {
        
        "public.*": 10,
        "admin": {

            "editor": 0
        }
    },
    "roles": 71
};


function initScripts(compId) {

    var baseUrl = "/" + CONFIG.operationKey + "/0";
    var nl = (CONFIG.dev ? "\r\n" : "");

    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
        "<head>" + nl +
        "<script type='text/javascript'>" + nl +
        (CONFIG.dev ? "// require.js reads this global property, if available" : "") + nl +
        "var require={" + nl +
            "baseUrl:'" + baseUrl + "'," + nl +
            "deps:['core/comp/" + Nscript + "']" + nl +
        "};" + nl +
        "window.onload=function(){" + nl +
            "N.ok='/"+ CONFIG.operationKey  + "';" + nl +
            "N.comp('body','" + compId + "')" + nl +
        "}" + nl +
        "</script>" + nl +
        "<script src='" + baseUrl + "/core/require.js/require.js'></script>" + nl +
        "</head>" + nl +
        "<body></body>" + nl +
        "</html>";
}


exports.route = function(link) {

    // TODO add a favicon
    if (link.req.url === "/favicon.ico") {
        send.ok(link.res);
        return;
    }

    var compId = traverse(link.pathname != "/" ? link.pathname.replace(/\/$/, "") : link.pathname, table, "");

    if (typeof compId == "number") {

        // set headers
        link.res.headers["content-style-type"] = "text/css";
        link.res.headers["content-type"]       = "text/html; charset=utf-8";

        send.ok(link.res, initScripts(compId));
    }
    else {
        send.notfound(link);
    }
};


/*
    borrowed logic from https://github.com/flatiron/director/blob/master/lib/director/router.js
    thanks!
*/
function traverse(path, routes, current, result, exact, match) {

    if (path === "/" && typeof routes[path] == "number") {
        return routes[path];
    }

    for (var r in routes) {

        if (routes.hasOwnProperty(r)) {

            exact = current + "/" + r;
            match = path.match(new RegExp("^" + exact));
            
            if (!match) {
                continue;
            }

            if (match[0] && match[0] == path) {
                return routes[r];
            }
            
            result = traverse(path, routes[r], exact);
            
            if (typeof result == "number") {
                return result;
            }
        }
    }
    
    return false;
};

