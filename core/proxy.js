var net = require("net");
var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");

// imported functions
var startApp    = require(CONFIG.root + "/core/app_starter.js").startApp;
var send        = require(CONFIG.root + "/core/send.js").send;
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

var tempApps = {
    'dev.mono.ch': 8001
}

// check orient connection and start proxy server
exports.start = function() {
    
    console.log('starting mono...');
    
    // establish the database connection
    orient.connect(CONFIG.orient, function(err, db) {

        if (err) {
            throw new Error(err);
        }
        
        // start proxy server
        var server = net.createServer(function(socket) { //'connection' listener
            
            var host;
            var connecting;
            var dataBuffer = [];
            
            // try set up piping on first data event
            socket.once('data', function setUpAppConnection (data) {
                
                dataBuffer.push(data);
                
                // get host
                if (!host) {
                    
                    host = data.toString('ascii').match(/host\: *([a-z0-9:\.]*)/i);
                    // TODO is a domain with port a diffrent host?
                    host = host ? host[1].split(":")[0] : host;
                }
                
                if (runningApplications[host]) {
                    console.log('pipe');
                    
                    var appSocket = net.connect(runningApplications[host], 'localhost');
                    appSocket.pipe(socket);
                    socket.pipe(appSocket);
                    
                    for (var i = 0, l = dataBuffer.length; i < l; ++i) {
                        appSocket.write(dataBuffer[i]);
                    }
                    
                    dataBuffer = [];
                    return;
                }
                
                /////////// start app \\\\\\\\\\\\
                
                if (connecting === 1) {
                    console.log('buffer data');
                    return dataBuffer.push(data);
                }
                
                if (!host) {
                    socket.removeListener('data', setUpAppConnection);
                    return socket.emit('error', 'No Host found in headers.\n\n' + data.toString());
                }
                
                connecting = 1;
                
                if (tempApps[host]) {
                    //console.log('connect to host ' + host);
                        
                    var appSocket = net.connect(10001, 'localhost', function () {
                        
                        runningApplications[host] = 10001;
                        
                        connecting = 0;
                        
                        for (var i = 0, l = dataBuffer.length; i < l; ++i) {
                            appSocket.write(dataBuffer[i]);
                        }
                        
                        dataBuffer = [];
                        
                    });
                    
                    appSocket.pipe(socket);
                    socket.pipe(appSocket);
                    
                    return;
                }
                
                // TODO abort this connection
                var msg = 'Host not found.';
                socket.end('HTTP/1.1 404 Not found\r\n' +
                'Date: ' + new Date().toString() + '\r\n' +
                'Server: Mopro 0.0.1\r\n' +
                'Content-Length: ' + msg.length + '\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/html; charset=UTF-8\r\n' +
                '\r\n' + msg);
            });
            
            /*setTimeout(function () {
            
                for (var i = 0, l = 100; i < l; ++i) {
                    socket.emit('data', i + ' ügülz µüetrîms\n');
                }
                
                setTimeout(function () {
                    socket.end();
                }, 200)
                
            }, 10);*/
                
            socket.on('error', function (err) {
                
                 err = 'HTTP/1.1 400 Bad Request\r\n' +
                'Date: ' + new Date().toString() + '\r\n' +
                'Server: Mopro 0.0.1\r\n' +
                'Content-Length: ' + err.length + '\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/html; charset=UTF-8\r\n' +
                '\r\n' + err;
                
                socket.end(err);
            });
            
            socket.on('end', function() {
                console.log('socket disconnected');
            });
        });
        
        server.listen(CONFIG.port, proxyHost, function() { //'listening' listener
            console.log('mono started.');
        });
    });
}

// find the application for this domain (without the routing table)
                /*return model.getDomainApplication(host, false, function(err, application) {
                    
                    if (err) {
                        return socket.emit('error', err.toString());
                    }
                    
                    var connectToApp = function (err, application) {
                        
                        if (err) {
                            // TODO handle error
                            return console.log(err);
                        }
                        
                        var appSocket = net.connect(application.port, 'localhost', function () {;
                        
                            appSocket.on('error', function (err) {
                                // TODO handle error
                                console.log(err);
                            });
                            
                            appSocket.on('end', function () {
                                // TODO app stoped
                                delete runningApplications[host];
                            });
                            
                            connecting = 0;
                                                                                              
                            console.log('send data buffer: ' + dataBuffer.length);
                            for (var i = 0, l = dataBuffer.length; i < l; ++i) {
                                socket.emit('data', dataBuffer[i]);
                            }
                            
                            dataBuffer = [];
                        });
                        
                        runningApplications[host] = appSocket;
                        //socket.pipe(appSocket);
                    };
                    
                    // if the application managed to publish its portnow try to start this application
                    if (application.port) {
                        console.log('app ' + host + ' is running');
                        connectToApp(null, application);
                    } else {
                        console.log('start app ' + host);
                        startApp(application.appId, host, connectToApp);
                    }
                });*/

/*
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
*/
