var http  = require("http");

// imported functions
var parseUrl  = require("url").parse,
    operation = require(CONFIG.root + "/core/operator.js").operation,
    route     = require(CONFIG.root + "/core/router.js").route;


var Server = exports.Server = function () {
};


Server.prototype.start = function() {
    var self = this;

    // start http server
    self.server = http.createServer(requestHandler)
    self.server.listen(CONFIG.dev ? CONFIG.devPort : CONFIG.port);
};


function requestHandler(req, res) {
debugger;
    var url = parseUrl(req.url, true),
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
        route(link);
    }
}

