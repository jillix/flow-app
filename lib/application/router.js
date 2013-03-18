var serve = require("./operations/static").getFile;

var baseUrl = "/" + M.config.operationKey + "/core/getModule";
var nl = (M.config.logLevel == "debug" ? "\r\n" : "");
var routingTables = {};

function initScripts(module, locale) {

    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
            "<head>" + nl +
                "<title>" + M.config.app.title + "</title>" + nl +
                "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" + nl +
                "<script type='text/javascript'>" + nl +
                    "var require={baseUrl: '" + baseUrl + "'};" + nl +
                    "window.onload=function(){" + nl +
                        "M.locale='" + locale + "';" + nl +
                        "M('body','" + module + "')" + nl +
                    "}" + nl +
                "</script>" + nl +
                "<!--[if lt IE 9]><script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script><![endif]-->" + nl +
                "<script src='/" + M.config.operationKey + "/core/getClient/require.js'></script>" + nl +
                "<script src='/" + M.config.operationKey + "/core/getClient/M.js'></script>" + nl +
            "</head>" + nl +
            "<body></body>" + nl +
        "</html>";
}

function route(link) {
    
    // TODO add a favicon
    if (link.req.url === "/favicon.ico") {
        return link.send(200);
    }
    
    var module = traverse(link.pathname.replace(/\/$/, ""), M.config.app.routes, "");

    if (typeof module == "string") {
        // handle possible i18n miids
        var locale = "*";
        var splits = module.split(":");

        if (splits.length > 1) {
            module = splits[0];
            locale = splits[1];
            if (link.req.session) {
                link.req.session.lang = locale;
            }
        } else {
            if (link.req.session && link.req.session.lang && link.req.session.lang !== 'null') {
                locale = link.req.session.lang;
            } else {
                locale = M.config.app.locale || "*";
            }
        }
        
        // set headers
        link.res.headers = {
            "content-type": "text/html; charset=utf-8",
            "access-control-allow-origin": 'http://jipics.net'
        };
        
        link.send(200, initScripts(module, locale));
    }
    else {
        serve(link);
    }
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

module.exports = route;
