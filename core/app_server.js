var http = require("http");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");

var connect = require("connect");

// imported functions
var parseUrl  = require("url").parse;
var send      = require(CONFIG.root + "/core/send.js").send;
var operator  = require(CONFIG.root + "/core/operator");
var route     = require(CONFIG.root + "/core/router.js").route;
var orient    = require(CONFIG.root + "/core/db/orient.js");
var model     = require(CONFIG.root + "/core/model/orient.js");

function appServerStart() {
    
    if (!CONFIG.app) {
        console.error("This server cannot be started without and application ID");
        process.exit(1);
    }

    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            console.error("Could not connect to the Orient database.");
            console.error(err);
            process.exit(2);
        }

        model.getApplication(CONFIG.app, function(err, application) {

            if (err) {
                console.error(err);
                process.exit(3);
            }
            var publicUser = parseInt(application.publicUser.split(":")[1]);
            if (isNaN(publicUser)) {
                console.error("Could not determine the public user for application: " + application.id);
                process.exit(4);
            }

            var host = "127.0.0.1";
            var port = CONFIG.port;

            var handler = requestHandler;

            // TODO add an application session option
            // currently testing this with the TruckShop only
            if (application.session) {
                var connect = require("connect");
                var cookieParser = connect.cookieParser();
                var session = connect.session({ secret: "mono", key: "mono.sid" });

                handler = function(req, res) {
                    cookieParser(req, res, function() {
                        req.originalUrl = req.url;
                        session(req, res, function() {
                            req.session.appid = CONFIG.app;
                            req.session.uid = req.session.uid || publicUser;
                            requestHandler(req, res);
                        });
                    });
                }
            }

            model.addApplicationPort(CONFIG.app, port, function(err) {

                // TODO if err, an error is thrown because req is not defined. Why?
                if (err) {
                    send.internalservererror({ req: req, res: res }, err);
                    return;
                }
            });

            // start http server
            http.createServer(handler).listen(port, host);
        });
    });
}

function requestHandler(req, res) {

    if (!req.headers.host) {
        send.badrequest({req: req, res: res}, "No host in request headers.");
        return;
    }
    
    // resume the request for POST requests
    var resume = req.method === "POST" ? util.pause(req) : function() {};

    var url = parseUrl(req.url, true),
        path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
        link = {
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            // TODO is a domain with port a diffrent host?
            host:       req.headers.host.split(":")[0],
            resume:     resume
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

// export start application server
exports.start = appServerStart;
