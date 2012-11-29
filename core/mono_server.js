var http = require("http");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");
var httpProxy = require('http-proxy');
var spawn = require("child_process").spawn;
var pause = require("pause");

// imported functions
var send      = require(CONFIG.root + "/core/send.js").send;
var orient    = require(CONFIG.root + "/core/db/orient.js");
var model     = require(CONFIG.root + "/core/model/orient.js");

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

    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(JSON.stringify(err));
        }

        // start http proxy server
        var proxyServer = httpProxy.createServer(proxyHandler);
        listenToHttpProxyEvents(proxyServer);
        proxyServer.listen(CONFIG.port, host);
    });
};

function proxyHandler(req, res, proxy) {

    var link = {
        req: req,
        res: res,
        resume: util.pause(req)
    }

    if (!req.headers.host) {
        send.badrequest(link, "No host in request headers.");
        return;
    }
    
    // TODO is a domain with port a diffrent host?
    var host = req.headers.host.split(":")[0];

    // the application is running so we can forward to request
    if (runningApplications[host]) {
        return proxyAndResume(link, proxy, runningApplications[host].port);
    }

    // the application is being started
    if (runningApplications[host] === 0) {
        send.serviceunavailable({ req: req, res: res }, "This application is starting...\nTry again in a few seconds.");
        return;
    }

    // mark this application as starting (0)
    runningApplications[host] = 0;

    // find the application for this domain (without the routing table)
    model.getDomainApplication(host, false, function(err, application) {

        if (err) {
            send.internalservererror({ req: req, res: res }, err);
            return;
        }

        var forwardRequest = function(err, application) {

            if (err) {
                send.internalservererror({ req: req, res: res }, err);
                return;
            }

            // cache the app
            runningApplications[host] = application;

            // forward the requst
            proxyAndResume(link, proxy, runningApplications[host].port);
        };

        // if the application managed to publish its portnow try to start this application
        if (application.port) {
            forwardRequest(null, application);
        } else {
            startApplication(application.appId, host, forwardRequest);
        }
    });
}

function listenToHttpProxyEvents(server) {

    server.proxy.on("proxyError", function(error, req, res) {

        if (!req.headers.host) {
            send.badrequest(link, "No host in request headers.");
            return;
        }

        // TODO: is a domain with port a diffrent host?
        var host = req.headers.host.split(":")[0];
        var application = runningApplications[host];

        if (runningApplications[host] === 0) {
            send.badrequest({ req: req, res: res }, "App starting...");
            return;
        }

        runningApplications[host] = 0;

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
            startApplication(application.appId, host, function(err, application) {
                if (application) {
                    runningApplications[host] = application;
                }
            });
        });
    });
}

function proxyAndResume(link, proxy, port) {
    proxy.proxyRequest(link.req, link.res, {
        host: "localhost",
        port: port
    });
    link.resume();
}

/*
 * This MUST be called only ONCE application
 */
function startApplication(appId, host, callback) {

    // TODO multiple-domain applications must be started only once

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

    var errorRetries = 3;
    var id = setInterval(function() {

        // find the application for this domain (without the routing table)
        model.getDomainApplication(host, false, function(err, application) {

            // try maximum 3 time in case something really bad happens (orient crashes)
            // at this point the application is for sure valid
            if (err) {
                if (!errorRetries) {
                    clearInterval(id);
                    return callback(err);
                } else {
                    --errorRetries;
                    return;
                }
            };

            // retry as long as the application does not have a port
            if (!application.port) {
                return;
            }

            clearInterval(id);
            callback(null, application);
        });

    }, 500);
}

