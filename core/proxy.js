// extend Object with clone function
Object.clone = function(obj) {
    
    function O(){}
    O.prototype = obj;
    return new O();
};

// get configuration
CONFIG = require(process.argv[2] || "../config.js");

// include modules
var http        = require("http"),
    parse       = require("url").parse,
    route       = require(CONFIG.root + "/core/router.js").route,
    operation   = require(CONFIG.root + "/core/operator.js").operation;

// start http server
http.createServer(function(req, res) {
    
    var url = parse(req.url, true),
        link = {
            
            req:    req,
            res:    res,
            query:  url.query || {},
            path:   url.pathname.replace(/\/$|^\//g, "").split("/", 42),
            host:   req.headers.host.split(":")[0].split(".").reverse()
        };
    
    link.res.headers = {};
    
    if (link.path[0] == CONFIG.operationKey) {
        
        operation(link);
    }
    else {
        
        route(link);
    }
    
}).listen(CONFIG.dev ? CONFIG.devPort : CONFIG.port);