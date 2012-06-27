var send = require(CONFIG.root + "/core/send").send,
    publicFiles = require(CONFIG.root + "/core/send").publicFiles;
    getDomainApplication = require(CONFIG.root + "/core/model/orient.js").getDomainApplication;

function initScripts(module, application, ie7) {
    
    var baseUrl = "/" + CONFIG.operationKey + "/core/getModule";
    var nl = (CONFIG.dev ? "\r\n" : "");

    var appScripts = "";
    for (var i in application.scripts) {
        appScripts += "<script type='text/javascript' src='" + application.scripts[i] + "'></script>" + nl;
    }

    var appCss = "";
    for (var i in application.css) {
        appCss += "<link rel='stylesheet' type='text/css' href='" + application.css[i] + "'/>" + nl;
    }

    var ieHtml5 =
        "<!-- Le HTML5 shim, for IE6-8 support of HTML5 elements -->" + nl +
        "<!--[if lt IE 9]>" + nl +
        "<script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script>" + nl +
        "<![endif]-->";

    return "<!DOCTYPE html>" + nl +
        "<html>" + nl +
        "<head>" + nl +
        appScripts +
        appCss +
        "<script type='text/javascript'>" + nl +
        (CONFIG.dev ? "// require.js reads this global property, if available" : "") + nl +
        "var require={" + nl +
            "baseUrl:'" + baseUrl + "'" + nl +
        "};" + nl +
        "window.onload=function(){" + nl +
            "N.ok='/"+ CONFIG.operationKey  + "';" + nl +
            (application.errorMiid ? "N.em = '" + application.errorMiid + "';" : "") +
            "N.mod(document.getElementsByTagName('body')[0],'" + module + "')" + nl +
        "}" + nl +
        "</script>" + nl +
        (ie7 ? "<script src='/" + CONFIG.operationKey + "/core/getClient/json2.js'></script>" + nl : "") +
        "<script src='/" + CONFIG.operationKey + "/core/getClient/require.js'></script>" + nl +
        "<script src='/" + CONFIG.operationKey + "/core/getClient/N.js'></script>" + nl +
        "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" + nl +
        ieHtml5 + nl +
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
            
            send.ok(link.res, initScripts(module, application, (link.req.headers['user-agent'].indexOf("MSIE 7.0") > -1 ? true : false)));
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
