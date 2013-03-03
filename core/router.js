var send = require(CONFIG.root + "/core/send").send;
var serve = require(CONFIG.root + "/core/operations/static").serve;
var getDomainApplication = require(CONFIG.root + "/core/model").getDomainApplication;

var baseUrl = "/" + CONFIG.operationKey + "/core/getModule";
var nl = (CONFIG.logLevel == "debug" ? "\r\n" : "");
var routingTables = {};

function initScripts(module, application, options) {

    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
            "<head>" + nl +
                "<title>" + application.title + "</title>" + nl +
                "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" + nl +
                "<script type='text/javascript'>" + nl +
                    (CONFIG.logLevel == "debug" ? "// require.js reads this global property, if available" : "") + nl +
                    "var require = { baseUrl: '" + baseUrl + "' };" + nl +
                    "var language = '" + options.language + "';" + nl +
                    "window.onload=function(){" + nl +
                        "M('body','" + module + "')" + nl +
                    "}" + nl +
                "</script>" + nl +
                "<!--[if lt IE 9]><script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script><![endif]-->" + nl +
                "<script src='/" + CONFIG.operationKey + "/core/getClient/require.js'></script>" + nl +
                "<script src='/" + CONFIG.operationKey + "/core/getClient/M.js'></script>" + nl +
            "</head>" + nl +
            "<body></body>" + nl +
        "</html>";
}

function route(link, application) {
    
    var module = traverse(link.pathname.replace(/\/$/, ""), application.routes, "");

    if (typeof module == "string") {
        // handle possible i18n miids
        var language = "*";
        var splits = module.split(":");

        if (splits.length > 1) {
            module = splits[0];
            language = splits[1];
            if (link.req.session) {
                link.req.session.lang = language;
            }
        } else {
            if (link.req.session && link.req.session.lang) {
                language = link.req.session.lang;
            } else {
                language = application.language || "*";
            }
        }

        // set headers
        link.res.headers["content-style-type"] = "text/css";
        link.res.headers["content-type"] = "text/html; charset=utf-8";
        link.res.headers["access-control-allow-origin"] = 'http://jipics.net';

        send.ok(link.res, initScripts(module, application, { language: language }));
    }
    else {
        serve(link, application.appId, application.publicDir);
    }
}

exports.route = function(link) {

    // TODO add a favicon
    if (link.req.url === "/favicon.ico") {
        send.ok(link.res);
        return;
    }
    
    if (!routingTables[link.host]) {
        
        getDomainApplication(link.host, true, function(err, application) {
            
            if (err || !application.routes) {
                send.notfound(link, err || "No routing table found");
                return;
            }
    
            routingTables[link.host] = application;
            
            route(link, application);
        });
        
    } else {
        
        route(link, routingTables[link.host]);
    }
};

/*
    borrowed logic from https://github.com/flatiron/director/blob/master/lib/director/router.js
    thanks!
*/
function traverse(path, routes, current, result, exact, match) {

    if (path === current && typeof routes["/"] === "string") {
        return routes["/"];
    }

    for (var r in routes) {

        if (routes.hasOwnProperty(r)) {

            exact = current + "/" + r;
            match = path.match(new RegExp("^" + exact));
            
            if (!match) {
                continue;
            }

            if (match[0] && match[0] == path && typeof routes[r] === "string") {
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
