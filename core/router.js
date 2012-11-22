var send = require(CONFIG.root + "/core/send").send;
var publicFiles = require(CONFIG.root + "/core/send").publicFiles;
var getDomainApplication = require(CONFIG.root + "/core/model/orient.js").getDomainApplication;

var baseUrl = "/" + CONFIG.operationKey + "/core/getModule";
var nl = (CONFIG.logLevel == "debug" ? "\r\n" : "");

function initScripts(module, application, ieVersion) {

    var supportScrips = "";
    
    if (ieVersion < 8) {
        
        supportScrips += "<script src='/" + CONFIG.operationKey + "/core/getClient/json2.js'></script>" + nl;
    }
    
    if (ieVersion < 9) {
        
        supportScrips += "<script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script>" + nl;
    }
    
    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
            "<head>" + nl +
                "<title>" + application.title + "</title>" + nl +
                "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" + nl +
                "<script type='text/javascript'>" + nl +
                    (CONFIG.logLevel == "debug" ? "// require.js reads this global property, if available" : "") + nl +
                    "var require={" + nl +
                        "baseUrl:'" + baseUrl + "'" + nl +
                    "};" + nl +
                    "window.onload=function(){" + nl +
                        "M('body','" + module + "')" + nl +
                    "}" + nl +
                "</script>" + nl + supportScrips +
                "<script src='/" + CONFIG.operationKey + "/core/getClient/require.js'></script>" + nl +
                "<script src='/" + CONFIG.operationKey + "/core/getClient/M.js'></script>" + nl +
            "</head>" + nl +
            "<body></body>" + nl +
        "</html>";
}

// IE version
function getIeVersion(userAgent) {
    
    var match = userAgent.match(/MSIE [0-9]/g);
    
    if (!match) {
        
        return NaN;
    }
    
    return parseInt(match[0].replace(/[^0-9]/g, ""), 10) || NaN;
}

exports.route = function(link) {

    // TODO add a favicon
    if (link.req.url === "/favicon.ico") {
        send.ok(link.res);
        return;
    }
    
    getDomainApplication(link.host, true, function(err, application) {

        if (err || !application.routes) {
            send.notfound(link, err || "No routing table found");
            return;
        }

        var module = traverse(link.pathname != "/" ? link.pathname.replace(/\/$/, "") : link.pathname, application.routes, "");

        if (typeof module == "string") {

            // set headers
            link.res.headers["content-style-type"] = "text/css";
            link.res.headers["content-type"]       = "text/html; charset=utf-8";
            
            send.ok(link.res, initScripts(module, application, getIeVersion(link.req.headers['user-agent'])));
        }
        else {
            publicFiles(link, application.appId, application.publicDir);
        }
    });
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
