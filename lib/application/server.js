// load mono api
require("../../api");

var http = require("http");
var fs = require("fs");
var util = require(M.config.root + "/lib/util.js");
var connect = require("connect");

// imported functions
var parseUrl  = require("url").parse;
var send      = require("./send");
var operator  = require("./operator");
var route     = require("./router").route;

function requestHandler(req, res) {
    
    if (!req.headers.host) {
        res.writeHead(400, {'content-type': 'text/plain'});
        return res.end("No host in request headers.");
    }

    var url = parseUrl(req.url, true),
        path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
        link = {
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            host:       req.headers.host.split(':')[0],
            lang:       req.headers['accept-language'],
            
            // resume the request for POST requests
            // TODO check out the new pause/resume in nodejs v0.10.0
            resume:     req.method === "POST" ? util.pause(req) : function() {},
            
            // send content
            send: send
        };

    link.res.headers = {};
    
    if (path[0] == M.config.operationKey) {
        
        if (path.length < 3) {
            return link.send(400, "incorrect operation url");
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

// start application server
if (!M.config.app) {
    console.error("This server cannot be started without and application ID");
    process.exit(1);
}

// establish the database connection
M.orient.connect(M.config.orient, function(err, db) {

    if (err) {
        console.error("Could not connect to the Orient database.");
        console.error(err);
        process.exit(2);
    }

    M.model.getApplication(M.config.app, function(err, application) {

        if (err) {
            console.error(err);
            process.exit(3);
        }
        var publicUser = parseInt(application.publicUser.split(":")[1]);
        if (isNaN(publicUser)) {
            console.error("Could not determine the public user for application: " + application.id);
            process.exit(4);
        }
        
        var handler = requestHandler;

        // TODO add an application session option
        // currently testing this with the TruckShop only
        if (application.session) {
            var cookieParser = connect.cookieParser();
            var session = connect.session({ secret: "mono", key: "mono.sid" });

            handler = function(req, res) {
                cookieParser(req, res, function() {
                    req.originalUrl = req.url;
                    session(req, res, function() {
                        req.session.appid = M.config.app;
                        req.session.uid = req.session.uid || publicUser;
                        requestHandler(req, res);
                    });
                });
            }
        }

        M.model.addApplicationPort(M.config.app, port, function(err) {

            if (err) {
                console.error(err);
                process.exit(5);
            }
            
            // start http server
            http.createServer(handler).listen(M.config.port, M.config.host, function () {
                process.stdout.write(M.config.app);
            });
        });
    });
});
