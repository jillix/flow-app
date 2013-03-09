// load mono api
require("../../api");

var net = require("net");
var fs = require("fs");
var util = require("../util.js");
var startApp = require("./app_starter").startApp;

// application port cache
var runningApplications = {};

// define default host
var proxyHost = "127.0.0.1";

// get the right host adress, if no external proxy is available
if (!M.config.proxy) {
    
    proxyHost = util.ip();
    
    if (!proxyHost) {
        throw new Error("Missing IP Address");
    }
}

function proxyRequest (host, socket, buffer, application) {
    
    var appSocket = net.connect(application.port, 'localhost', function () {
        appSocket.write(buffer);
    });
    
    appSocket.on('error', function (err) {
        
        runningApplications[host] = undefined;
        send(socket, '200 OK','<html><head><script>window.location.reload()</script></head><body>Please reload.</body></html>');
    });
    
    // down stream
    appSocket.pipe(socket);
    // up stream
    socket.pipe(appSocket);
}

function connectToApp (host, socket, buffer, err, application) {
    
    if (!application || err) {
        runningApplications[host] = undefined;
        return send(socket, '500 Internal Error',  err ? err.toString() : 'No app info');
    }
    
    runningApplications[host] = {
        port: application.port,
        appId: application.appId
    };
    
    return proxyRequest(host, socket, buffer, application);
};

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

// establish the database connection
M.orient.connect(M.config.orient, function(err, db) {

    if (err) {
        throw new Error(err);
    }
    
    // TODO
    // test a post request to an application that is not yet running
    // if problems occur, just buffer incoming data and write it later
    // to the appSocket stream.
    
    // start proxy server
    var server = net.createServer(function(socket) {
        
        // set up piping on first data event
        //socket.setKeepAlive(true);
        socket.once('data', function (buffer) {
            
            // get host
            var host = buffer.toString('ascii').match(/host\: *([a-z0-9:\.]*)/i);
            
            if (!host) {
                return send(socket, '400 Bad Request', 'No Host found in headers.\n\n' + data.toString());
            }
            
            // TODO is a domain with port a diffrent host?
            host = host[1].split(":")[0];
            
            if (runningApplications[host] === null) {
                return send(socket, '200 OK', 'Application is starting...');
            }
            
            // proxy request
            if (runningApplications[host]) {
                return proxyRequest(host, socket, buffer, runningApplications[host]);
            }
            
            runningApplications[host] = null;
            
            // start application process
            M.model.getDomainApplication(host, false, function(err, application) {
                
                if (!application) {
                    runningApplications[host] = undefined;
                    return send(socket, '404 Not found', 'Application not found.');
                }
                
                if (err) {
                    runningApplications[host] = undefined;
                    return send(socket, '500 Internal Server Error', err.toString());
                }
                
                startApp(host, socket, buffer, application, connectToApp);
            });
        });
    });
    
    server.listen(M.config.port, proxyHost);
});
