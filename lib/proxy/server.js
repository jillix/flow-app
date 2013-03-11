// load mono api
require("../../api");

var net = require("net");
var fs = require("fs");
var util = require("../util.js");
var startApp = require("./spawner");

// application port cache
var runningApps = {};

// define default host
var proxyHost = "127.0.0.1";
var appHost = "127.0.0.1";

// get the right host adress, if no external proxy is available
if (!M.config.proxy) {
    
    proxyHost = util.ip();
    
    if (!proxyHost) {
        throw new Error("Missing IP Address");
    }
}

function proxyRequest (host, socket, buffer, application) {
    
    var appSocket = net.connect(application.port, appHost, function () {
        appSocket.write(buffer);
    });
    
    appSocket.on('error', function (err) {
        
        runningApps[host] = undefined;
        send(socket, 200,'<html><head><script>window.location.reload()</script></head><body>Please reload.</body></html>');
    });
    
    // down stream
    appSocket.pipe(socket);
    // up stream
    socket.pipe(appSocket);
}

function send (socket, status, msg) {
    
    socket.end(
        'HTTP/1.1 ' + status + '\r\n' +
        'Date: ' + new Date().toString() + '\r\n' +
        'Server: mono dev\r\n' +
        'Content-Length: ' + msg.length + '\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/html; charset=utf-8\r\n' +
        '\r\n' + msg
    );
}

function killAllApplications (err) {
    
    for (var host in runningApps) {
        
        if (runningApps[host] && runningApps[host].pid) {
            process.kill(runningApps[host].pid);
        }
    }
    
    if (err) {
        console.log(err.stack);
        return process.exit(1);
    }
    
    process.exit();
}

// on user term/int or exception, kill all application processes and exit
process.on('SIGTERM', killAllApplications);
process.on('SIGINT', killAllApplications);
process.on('uncaughtException', killAllApplications);

// establish the database connection
M.orient.connect(M.config.orient, function(err, db) {

    if (err) {
        throw new Error(err);
    }
    
    // TODO
    // test a post request to an application that is not yet running
    // if problems occur, just buffer incoming data and write it later
    // to the appSocket stream. Or use pause/resume in node v0.10.0?
    
    // start proxy server
    var server = net.createServer(function(socket) {
        
        // set up piping on first data event
        socket.once('data', function (buffer) {
            
            // get host
            var host = buffer.toString('ascii').match(/host\: *([a-z0-9:\.]*)/i);
            
            if (!host) {
                return send(socket, 400, 'No Host found in headers.\n\n' + data.toString());
            }
            
            if (runningApps[host] === null) {
                return send(socket, 200, 'Application is starting...');
            }
            
            // proxy request
            if (runningApps[host]) {
                return proxyRequest(host, socket, buffer, runningApps[host]);
            }
            
            runningApps[host] = null;
            
            startApp(host, runningApps, function (err, application) {
                
                if (err) {
                    runningApps[host] = undefined;
                    return send(socket, err[0], err[1].toString());
                }
                
                runningApps[host] = {
                    port: application.port,
                    appId: application.appId,
                    pid: application.pid
                };
                
                proxyRequest(host, socket, buffer, application);
            });
        });
    });
    
    server.listen(M.config.port, proxyHost);
});
