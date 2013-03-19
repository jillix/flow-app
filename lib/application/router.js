var serve = require("./operations/static").getFile;

function initScripts(module, locale) {
    
    return "<!DOCTYPE html>" +
        "<html>" +
            "<head>" +
                (M.config.app.title ? "<title>" + M.config.app.title + "</title>" : "")  +
                (M.config.app.favicon ? "<link rel='icon' href='" + M.config.app.favicon + "'/>" : "") +
                "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" +
                "<script type='text/javascript'>" +
                    "var require={baseUrl:'/" + M.config.operationKey + "/core/getModule'};" +
                    "window.onload=function(){" +
                        "M.locale='" + locale + "';" +
                        "M('body','" + module + "')" +
                    "}" +
                "</script>" +
                "<!--[if lt IE 9]><script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script><![endif]-->" +
                "<script src='/" + M.config.operationKey + "/core/getClient/require.js'></script>" +
                "<script src='/" + M.config.operationKey + "/core/getClient/M.js'></script>" +
            "</head>" +
            "<body></body>" +
        "</html>";
}

function route(link) {
    
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
