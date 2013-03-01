//var http = require("http");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");
var httpProxy = require('http-proxy');

// imported functions
var startApp    = require(CONFIG.root + "/core/app_starter.js").startApp;
var send        = require(CONFIG.root + "/core/send.js").send;
var orient      = require(CONFIG.root + "/core/db/orient.js");
var model       = require(CONFIG.root + "/core/model/orient.js");

// application port cache
var runningApplications = {};

// define default host
var host = "127.0.0.1";

// get the right host adress, if no external proxy is available
if (!CONFIG.proxy) {
    
    host = util.ip();
    
    if (!host) {
        throw new Error("Missing IP Address");
    }
}

// check orient connection and start proxy server
exports.start = function() {
    
    console.log('mono is starting...');
    
    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(err);
        }
        
        // start http proxy server
        var server = httpProxy.createServer(proxyHandler);
        server.proxy.on("proxyError", onProxyError);
        server.listen(CONFIG.port, host);
        
        console.log('mono is started.');
    });
}

// handle a proxy request
function proxyHandler(req, res, proxy) {

    var link = {
        req: req,
        res: res,
        resume: util.pause(req)
    };

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
        // TODO buffer requests
        send.serviceunavailable(link, "This application is starting...\nTry again in a few seconds.");
        return;
    }

    // mark this application as starting (0)
    runningApplications[host] = 0;

    // find the application for this domain (without the routing table)
    model.getDomainApplication(host, false, function(err, application) {
        
        if (err) {
            send.internalservererror(link, err);
            delete runningApplications[host];
            return;
        }

        var forwardRequest = function(err, application) {

            if (err) {
                send.internalservererror(link, err);
                delete runningApplications[host];
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
            startApp(application.appId, host, forwardRequest);
        }
    });
}

// handle proxy errors
function onProxyError(error, req, res) {
    
    console.log('\n==========================================');
    console.log(error);
    console.log('==========================================\n');
    
    var link = {
        req: req,
        res: res
    };

    if (!req.headers.host) {
        send.badrequest(link, "No host in request headers.");
        return;
    }

    // TODO is a domain with port a diffrent host?
    var host = req.headers.host.split(":")[0];
    var application = runningApplications[host];

    if (runningApplications[host] === 0) {
        send.badrequest(link, "App starting...");
        return;
    }

    runningApplications[host] = 0;

    // TODO check if the application is still using the port and remove it from the
    // database in order not to screw future admin statistics

    var logOperationUrl = "/@/core/getLog";
    var logFilePath = CONFIG.APPLICATION_ROOT + application.appId + "/log.txt";
    var restartMessage = "In the meanwhile we are hardly working to revive it.";

    // this is only for log requests
    if (req.url === logOperationUrl) {
        fs.readFile(logFilePath, function(err, data) {

            if (err) {
                // let the user know that his application crashed
                var message = "Sorry! This application crashed and there's not a shred of evidence why this happened. :(";
                send.internalservererror(link, message);
                return;
            }

            send.ok(res, data);
        });
        return;
    }

    fs.exists(logFilePath, function(exists) {

        if (!exists) {
            send.internalservererror(link, "Sorry! This application crashed and there's not a shred of evidence why this happened. :(\n" + restartMessage);
        } else {
            res.headers = res.headers || {};
            res.headers["content-type"] = "text/html";
            send.internalservererror(link, "Sorry! This application crashed. Maybe if you check out the <a href='" + logOperationUrl + "'>log</a> you find out why.\n" + restartMessage);
        }

        // now try to start this application
        startApp(application.appId, host, function(err, application) {
            if (application) {
                runningApplications[host] = application;
            } else {
                delete runningApplications[host];
            }
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

