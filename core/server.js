var http  = require("http");

// imported functions
var parseUrl  = require("url").parse,
    send      = require(CONFIG.root + "/core/send.js").send,
    operation = require(CONFIG.root + "/core/operator.js").operation,
    route     = require(CONFIG.root + "/core/router.js").route,
    orient    = require(CONFIG.root + "/core/db/orient.js"),
    exec      = require("child_process").exec;

var Server = exports.Server = function () {};

Server.prototype.start = function() {

    var self = this;
    var startHTTPServer = function() {
        
        // establish the database connection
        orient.connect(CONFIG.orient, function(err, db) {

            if (err) {
                throw new Error(JSON.stringify(err));
            }
            
            // start http server
            self.server = http.createServer(requestHandler);
            self.server.listen(CONFIG.dev ? CONFIG.devPort : CONFIG.port);
        });
    };
    
    // start DB in dev mode
    if (CONFIG.dev) {
        
        // start db server
        exec(CONFIG.orient.exec);
        
        setTimeout(function() {
            
            startHTTPServer();
        
        }, CONFIG.orient.startTime);
    }
    else {
        
        startHTTPServer();
    }
};

function requestHandler(req, res) {

    var url = parseUrl(req.url, true),
        path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
        link = {
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            host:       CONFIG.dev ? req.headers.host.split(":")[0] : req.headers.host
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
        
        operation(link);
    }
    else {
        
        link.path = path;
        
        route(link);
    }
}
