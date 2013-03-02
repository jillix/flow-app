var net = require("net");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");

// imported functions
var startApp    = require(CONFIG.root + "/core/app_starter.js").startApp;
var orient      = require(CONFIG.root + "/core/db/orient.js");
var model       = require(CONFIG.root + "/core/model/orient.js");

// application port cache
var runningApplications = {};

// define default host
var proxyHost = "127.0.0.1";

// get the right host adress, if no external proxy is available
if (!CONFIG.proxy) {
    
    proxyHost = util.ip();
    
    if (!proxyHost) {
        throw new Error("Missing IP Address");
    }
}

function proxyRequest (host, socket, buffer) {
    
    var appSocket = net.connect(runningApplications[host].port, 'localhost', function () {
        appSocket.write(buffer);
    });
    
    appSocket.on('error', function () {
        // port in orient, but app is not running
        startApp(host, socket, buffer, runningApplications[host], connectToApp);
    });
    
    appSocket.pipe(socket);
    socket.pipe(appSocket);
}

function connectToApp (host, socket, buffer, err, application) {
    
    if (!application || err) {
        return socket.emit('error', err ? err.toString() : 'No app info');
    }
    
    runningApplications[host] = {
        port: application.port,
        appId: application.appId
    };
    
    return proxyRequest(host, socket, buffer);
};

function send (socket, status, msg) {
    
    socket.end(
        'HTTP/1.1 ' + status + '\r\n' +
        'Date: ' + new Date().toString() + '\r\n' +
        'Server: Mopro 0.0.1\r\n' +
        'Content-Length: ' + msg.length + '\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        '\r\n' + msg
    );
}

// check orient connection and start proxy server
exports.start = function() {
    
    console.log('starting mono...');
    
    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(err);
        }
        
        // TODO
        // test a post request to an application that is not yet running
        // if problems occur, just buffer incoming data and write it later
        // to the appSocket stream.
        
        // TODO when multiple sockets connect at (nearly) the same time,
        // multiple process are spawned.
        
        // start proxy server
        var server = net.createServer(function(socket) {
            
            // set up piping on first data event
            socket.once('data', function (buffer) {
                
                // get host
                var host = buffer.toString('ascii').match(/host\: *([a-z0-9:\.]*)/i);
                // TODO is a domain with port a diffrent host?
                host = host ? host[1].split(":")[0] : host;
                
                // proxy request
                if (runningApplications[host]) {
                    return proxyRequest(host, socket, buffer);
                }
                
                if (runningApplications[host] === null) {
                    return send(socket, '200 OK', 'Application is starting...');
                }
                
                runningApplications[host] = null;
                
                if (!host) {
                    return socket.emit('error', 'No Host found in headers.\n\n' + data.toString());
                }
                
                // start application process
                model.getDomainApplication(host, false, function(err, application) {
                    
                    if (!application) {
                        return send(socket, '404 Not found', 'Application not found.');
                    }
                    
                    if (err) {
                        return socket.emit('error', err.toString());
                    }
                    
                    // if the application managed to publish its portnow try to start this application
                    if (application.port) {
                        connectToApp(host, socket, buffer, null, application);
                    } else {
                        startApp(host, socket, buffer, application, connectToApp);
                    }
                });
            });
                
            socket.on('error', function (err) {
                send(socket, '400 Bad Request', err);
            });
        });
        
        server.listen(CONFIG.port, proxyHost, function() {
            console.log('mono started.');
        });
    });
}
