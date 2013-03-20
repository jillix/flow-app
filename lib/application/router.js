var serve = require("./operations/static").getFile;

function route(link) {
    
    var module = traverse(link.pathname.replace(/\/$/, ""), M.config.app.routes, "");

    if (typeof module == "string") {
        
        module = module.split(":");
        
        // TODO set locale in sesstion
        if (module[1] && link.session.loc !== module[1]) {
            //link.session.set('loc', module[1]);
            link.session.loc = module[1];
        }
        
        // set headers
        link.res.headers = {
            "content-type": "text/html; charset=utf-8",
            "access-control-allow-origin": 'http://jipics.net'
        };
        
        link.send(200,
            "<!DOCTYPE html><html><head>" +
                (M.config.app.title ? "<title>" + M.config.app.title + "</title>" : "")  +
                (M.config.app.favicon ? "<link rel='icon' href='" + M.config.app.favicon + "'/>" : "") +
                "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>" +
                "<script type='text/javascript'>" +
                    "var require={baseUrl:'/" + M.config.operationKey + "/core/getModule'};" +
                    "window.onload=function(){" +
                        "M.locale='" + link.session.loc + "';" +
                        "M('body','" + module[0] + "')" +
                    "}" +
                "</script>" +
                "<!--[if lt IE 9]><script src='http://html5shim.googlecode.com/svn/trunk/html5.js'></script><![endif]-->" +
                "<script src='/" + M.config.operationKey + "/core/getClient/require.js'></script>" +
                "<script src='/" + M.config.operationKey + "/core/getClient/M.js'></script>" +
            "</head><body></body></html>"
        );
    
    } else {
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
