// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
        
    //writeable: false, (default value)
    //enumerable: false, (default value)
    //configurable: false, (default value)
    value: function(){
        
        function O(){}
        O.prototype = this;
        return new O();
    }
});

// get configuration
CONFIG = require(process.argv[2] || "../config.js");

// include modules
var http        = require("http"),
    parse       = require("url").parse,
    send        = require(CONFIG.root + "/core/send").send,
    operation   = require(CONFIG.root + "/core/operator.js").operation,
    Nscript     = CONFIG.dev ? "N.dev" : "N",
    delimiter   = "\/";

// TODO: get routing tables from db (mongodb) 
var table = {
    
    '/': 0,
    'users': {
        
        'public.*': 10,
        'admin': {
            
            'editor': 0
        }
    },
    'roles': 71
};

// start http server
http.createServer(function(req, res) {
    
    var url = parse(req.url, true),
        link = {
            
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            path:       url.pathname.replace(/\/$|^\//g, "").split("/", 42),
            host:       req.headers.host.split(":")[0].split(".").reverse()
        };
    
    link.res.headers = {};
    
    if (link.path[0] == CONFIG.operationKey) {
        
        operation(link);
    }
    else {
        
        var compID = traverse(url.pathname != delimiter ? url.pathname.replace(/\/$/, "") : url.pathname, table, "");
    
        if (typeof compID == "number") {
        
            //set headers
            res.headers['content-style-type'] = "text/css";
            res.headers['content-type']       = "text/html; charset=utf-8";
            
            send.ok(
                
                res,
                "<!DOCTYPE html><html><head>"+
                "<script type='text/javascript'>"+
                "var require={"+
                    "baseUrl:'/"+ CONFIG.operationKey +"/0',"+
                    "deps:['comp/"+ Nscript +"']"+
                "};"+
                "window.onload=function(){"+
                    "N.ok='/"+ CONFIG.operationKey +"';"+
                    "N.comp('body','"+ compID +"')"+
                "}"+
                "</script>"+
                "<script src='/"+ CONFIG.operationKey +"/0/comp/require.js'></script>"+
                "</head><body></body></html>"
            );
        }
        else {
            
            send.notfound(res);
        }
    }
    
}).listen(CONFIG.dev ? CONFIG.devPort : CONFIG.port);

/*
    borrowed logic from https://github.com/flatiron/director/blob/master/lib/director/router.js
    thanks!
*/
function traverse(path, routes, current, result, exact, match) {

    if (path === delimiter && typeof routes[path] == "number") {
        
        return routes[path];
    }
    
    for (var r in routes) {
        
        if (routes.hasOwnProperty(r)) {
        
            exact = current + delimiter + r;
            
            match = path.match(new RegExp('^' + exact));
            
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