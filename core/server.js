var http  = require("http");

// imported functions
var parseUrl  = require("url").parse,
    send      = require(CONFIG.root + "/core/send.js").send,
    operation = require(CONFIG.root + "/core/operator.js").operation,
    route     = require(CONFIG.root + "/core/router.js").route;


var Server = exports.Server = function () {
};


Server.prototype.start = function() {
    var self = this;

    // start http server
    self.server = http.createServer(requestHandler);
    self.server.listen(CONFIG.dev ? CONFIG.devPort : CONFIG.port);
};


function requestHandler(req, res) {

    var url = parseUrl(req.url, true),
        path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
        link = {
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            host:       req.headers.host.split(":")[0].split(".").reverse()
        };

    link.res.headers = {};

    if (path[0] == CONFIG.operationKey) {
        
        if (path.length < 3) {
        
            return send.badrequest(link, "incorrect operation url");
        }
        
        link.operation = {
            
            module: path[1],
            method: path[2]
        };
        
        link.path = path.slice(3);
        
        console.log(link.operation);
        
        operation(link);
    }
    else {
        route(link);
    }
}

