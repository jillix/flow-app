var send = require(CONFIG.root + "/core/send").send;

// TODO get routing tables from db (mongodb)
var table = {
    
    "/": "mono_stdl_layout_1",//"mono_editor_1",
    "stdl": "mono_stdl_list_1",
    /*,
    "users": {
        
        "public.*": 10,
        "admin": {

            "editor": 0
        }
    },
    "roles": 71
    */
};

function initScripts(module, ie7) {

    var baseUrl = "/" + CONFIG.operationKey + "/core/getModule";
    var nl = (CONFIG.dev ? "\r\n" : "");
    
    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
        "<head>" + nl +
        "<script type='text/javascript'>" + nl +
        (CONFIG.dev ? "// require.js reads this global property, if available" : "") + nl +
        "var require={" + nl +
            "baseUrl:'" + baseUrl + "'" + nl +
        "};" + nl +
        "window.onload=function(){" + nl +
            "N.ok='/"+ CONFIG.operationKey  + "';" + nl +
            "N.mod(document.getElementsByTagName('body')[0],'" + module + "')" + nl +
        "}" + nl +
        "</script>" + nl +
        (ie7 ? "<script src='/" + CONFIG.operationKey + "/core/getClient/json2.js'></script>" + nl : "") +
        "<script src='/" + CONFIG.operationKey + "/core/getClient/require.js'></script>" + nl +
        "<script src='/" + CONFIG.operationKey + "/core/getClient/N.js'></script>" + nl +
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
    
    var module = traverse(link.pathname != "/" ? link.pathname.replace(/\/$/, "") : link.pathname, table, "");
    
    if (typeof module == "string") {

        // set headers
        link.res.headers["content-style-type"] = "text/css";
        link.res.headers["content-type"]       = "text/html; charset=utf-8";
        
        send.ok(link.res, initScripts(module, (link.req.headers['user-agent'].indexOf("MSIE 7.0") > -1 ? true : false)));
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

    if (path === "/" && typeof routes[path] == "string") {
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
            
            if (typeof result == "string") {
                return result;
            }
        }
    }
    
    return false;
};

