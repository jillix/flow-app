var http = require("http");
var ip = require(CONFIG.root + "/core/util.js").ip;

// imported functions
var parseUrl  = require("url").parse,
    send      = require(CONFIG.root + "/core/send.js").send,
    operator = require(CONFIG.root + "/core/operator"),
    route     = require(CONFIG.root + "/core/router.js").route,
    orient    = require(CONFIG.root + "/core/db/orient.js"),
    exec      = require("child_process").exec;

var Server = exports.Server = function () {};

// TODO commented out until nginx will be removed
//var host = ip();
//
//if (!host) {
//    if (CONFIG.dev) {
        host = "127.0.0.1";
//    } else {
//        throw new Error("Missing IP Address");
//    }
//}

Server.prototype.start = function() {

    var self = this;

    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(JSON.stringify(err));
        }

        var port = CONFIG.dev ? CONFIG.devPort : CONFIG.port;
        var handler = proxyHandler;

        if (CONFIG.app) {
            port = 10001;
            var handler = requestHandler;
        }

        // start http server
        self.server = http.createServer(handler);
        self.server.listen(port, host);
    });
};

function proxyHandler(req, res) {

    req.pause();

    var proxy = new (require('http-proxy')).RoutingProxy();
    var getDomainApplication = require(CONFIG.root + "/core/model/orient.js").getDomainApplication;

    var host = CONFIG.dev ? req.headers.host.split(":")[0] : req.headers.host;
    getDomainApplication(host, false, function(err, application) {

        if (err) {
            send.notfound(res, err);
            return;
        }

        // TODO find the port for this application
        proxy.proxyRequest(req, res, {
            host: 'localhost',
            port: 10001
        });
        req.resume();
    });
}

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

        operator.operation(link);
    }
    else {
        link.path = path;
        route(link);
    }
}

