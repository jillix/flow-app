var http = require("http");
var fs = require("fs");
var ip = require(CONFIG.root + "/core/util.js").ip;

// imported functions
var parseUrl  = require("url").parse,
    send      = require(CONFIG.root + "/core/send.js").send,
    operator = require(CONFIG.root + "/core/operator"),
    route     = require(CONFIG.root + "/core/router.js").route,
    orient    = require(CONFIG.root + "/core/db/orient.js"),
    model     = require(CONFIG.root + "/core/model/orient.js");

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
            var handler = requestHandler;

            model.addApplicationPort(CONFIG.app, port, function(err) {

                if (err) {
                    send.internalservererror({ req: req, res: res }, err);
                    return;
                }
            });
        }

        // start http server
        self.server = http.createServer(handler);
        self.server.listen(port, host);
    });
};

function proxyHandler(req, res) {

    req.pause();

    var proxy = new (require('http-proxy')).RoutingProxy();

    var host = CONFIG.dev ? req.headers.host.split(":")[0] : req.headers.host;
    model.getDomainApplication(host, false, function(err, application) {

        if (err) {
            send.notfound({ req: req, res: res }, err);
            return;
        }

        if (!application.port) {
            send.serviceunavailable({ req: req, res: res }, "This application did not start yet...");
            return;
        }

        proxy.on("proxyError", function(error, req, res) {

            var logOperationUrl = "/@/core/getLog";
            var logFilePath = CONFIG.APPLICATION_ROOT + application.appId + "/log.txt";

            if (req.url === logOperationUrl) {
                fs.readFile(logFilePath, function(err, data) {

                    if (err) {
                        send.internalservererror({ req: req, res: res }, "Sorry! This application crashed and there's not a shred of evidence why this happened. :(");
                        return;
                    }

                    send.ok(res, data);
                });
                return;
            }

            fs.exists(logFilePath, function(exists) {

                if (!exists) {
                    send.internalservererror({ req: req, res: res }, "Sorry! This application crashed and there's not a shred of evidence why this happened. :(");
                } else {
                    res.headers = res.headers || {};
                    res.headers["content-type"] = "text/html";
                    send.internalservererror({ req: req, res: res }, "Sorry! This application crashed. Maybe if you check out the <a href='" + logOperationUrl + "'>log</a> you find out why.");
                }
            });
        });

        proxy.proxyRequest(req, res, {
            host: "localhost",
            port: application.port
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

