var send = require(CONFIG.root + "/core/send").send;

var Nscript = CONFIG.clientLibrary + (CONFIG.dev ? ".dev" : "");

// TODO: get routing tables from db (mongodb) 
var table = {
    
    "/": 0,
    "users": {
        
        "public.*": 10,
        "admin": {

            "editor": 0
        }
    },
    "roles": 71
};


exports.route = function(link) {

    var compId = traverse(link.pathname != "/" ? link.pathname.replace(/\/$/, "") : link.pathname, table, "");

    if (typeof compId == "number") {

        // set headers
        link.res.headers["content-style-type"] = "text/css";
        link.res.headers["content-type"]       = "text/html; charset=utf-8";
        
        send.ok(link.res,
            "<!DOCTYPE html><html><head>"+
            "<script type='text/javascript'>"+
            "var require={"+
                "baseUrl:'/"+ CONFIG.operationKey +"/0',"+
                "deps:['comp/"+ Nscript +"']"+
            "};"+
            "window.onload=function(){"+
                "N.ok='/"+ CONFIG.operationKey +"';"+
                "N.comp('body','"+ compId +"')"+
            "}"+
            "</script>"+
            "<script src='/"+ CONFIG.operationKey +"/0/comp/require.js'></script>"+
            "</head><body></body></html>"
        );
    }
    else {
        send.notfound(link.res);
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

