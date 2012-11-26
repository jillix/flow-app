var http = require("http");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");
var httpProxy = require('http-proxy');

var connect = require("connect");

// imported functions
var parseUrl  = require("url").parse,
    send      = require(CONFIG.root + "/core/send.js").send,
    operator  = require(CONFIG.root + "/core/operator"),
    route     = require(CONFIG.root + "/core/router.js").route,
    orient    = require(CONFIG.root + "/core/db/orient.js"),
    model     = require(CONFIG.root + "/core/model/orient.js");

var runningApplications = {};

var Server = exports.Server = function () {};

var host = "127.0.0.1";

// get the right host adress, if no external proxy is available
if (!CONFIG.app && !CONFIG.proxy) {
    
    host = util.ip();
    
    if (!host) {
        
        throw new Error("Missing IP Address");
    }
}

Server.prototype.start = function() {

    var self = this;

    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(JSON.stringify(err));
        }

        var port = CONFIG.port;
        
        if (CONFIG.app) {

            var handler = requestHandler;

            // TODO add an application session option
            // currently testing this with the TruckShop only
            if (CONFIG.app === "00000000000000000000000000000053") {
                var connect = require("connect");
                var cookieParser = connect.cookieParser();
                var session = connect.session({ secret: "mono", key: "mono.sid" });

                handler = function(req, res) {
                    cookieParser(req, res, function() {
                        req.originalUrl = req.url;
                        session(req, res, function() {
                            req.session.appid = CONFIG.app;
                            // TODO hardcoded user: use getDomainPublicUser for this
                            var publicUser = 74;
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
            self.server = http.createServer(handler);
        
        } else {
            
            // start http proxy server
            self.server = httpProxy.createServer(proxyHandler);
            listenToHttpProxyEvents(self.server);
        }

        self.server.listen(port, host);
    });
};

var startingApps = {};

function startApplication(appId) {

    if (startingApps[appId]) {
        return;
    }

    startingApps[appId] = true;

    var spawn = require("child_process").spawn;

    // add the required MONO_ROOT variable to the environment
    var env = process.env;
    env.MONO_ROOT = CONFIG.root;
    var node = spawn(CONFIG.root + "/admin/scripts/installation/start_app.sh", [ appId ], { env: env });

    var log = fs.createWriteStream(CONFIG.APPLICATION_ROOT + appId + "/log.txt");
    node.stdout.pipe(log);
    node.stderr.pipe(log);
    
    if (CONFIG.logTerm) {
        node.stdout.pipe(process.stdout);
        node.stderr.pipe(process.stderr);
    }
}

function proxyHandler(req, res, proxy) {
    
    if (!req.headers.host) {
        
        send.badrequest({req: req, res: res}, "No host in request headers.");
        return;
    }
    
    // TODO: is a domain with port a diffrent host?
    var host = req.headers.host.split(":")[0];
    
    if (!runningApplications[host]) {
        
        // find the application for this domain (without the routing table)
        model.getDomainApplication(host, false, function(err, application) {
        
            if (err) {
                send.notfound({ req: req, res: res }, err);
                return;
            }
            
            // let the user know we are trying to work here
            send.serviceunavailable({ req: req, res: res }, "This application is starting...\nTry again in a few seconds.");
    
            // now try to start this application
            startApplication(application.appId);
            
            runningApplications[host] = application;
    
            return;
        });
        
    } else {
        
        proxy.proxyRequest(req, res, {
            host: "localhost",
            port: runningApplications[host].port
        });
    }
}

function listenToHttpProxyEvents(server) {
    
    server.on("proxyError", function(error, req, res) {
        
        if (!req.headers.host) {
            
            send.badrequest({req: req, res: res}, "No host in request headers.");
            return;
        }
        
        // TODO: is a domain with port a diffrent host?
        var host = req.headers.host.split(":")[0];
        var application = runningApplications[host];
        
        // TODO check if the application is still using the port and remove it from the
        // database in order not to screw future admin statistics
    
        var logOperationUrl = "/@/core/getLog";
        var logFilePath = CONFIG.APPLICATION_ROOT + application.appId + "/log.txt";
        var restartMessage = "In the meanwhile we are hardly working to revive it.";
    
        if (req.url === logOperationUrl) {
            fs.readFile(logFilePath, function(err, data) {
    
                if (err) {
                    // let the user know that his application crashed
                    var message = "Sorry! This application crashed and there's not a shred of evidence why this happened. :(";
                    send.internalservererror({ req: req, res: res }, message);
                    return;
                }
    
                send.ok(res, data);
            });
            return;
        }
    
        fs.exists(logFilePath, function(exists) {
    
            if (!exists) {
                send.internalservererror({ req: req, res: res }, "Sorry! This application crashed and there's not a shred of evidence why this happened. :(\n" + restartMessage);
            } else {
                res.headers = res.headers || {};
                res.headers["content-type"] = "text/html";
                send.internalservererror({ req: req, res: res }, "Sorry! This application crashed. Maybe if you check out the <a href='" + logOperationUrl + "'>log</a> you find out why.\n" + restartMessage);
            }
    
            // now try to start this application
            startApplication(application.appId);
        });
    });
    
    server.on("end", function(error, req, res) {
        
        if (!req.headers.host) {
            
            send.badrequest({req: req, res: res}, "No host in request headers.");
            return;
        }
        
        // TODO: is a domain with port a diffrent host?
        var host = req.headers.host.split(":")[0];
        var application = runningApplications[host];
        
        if (startingApps[application.appId]) {
            delete startingApps[application.appId];
        }
        
        delete runningApplications[host];
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

