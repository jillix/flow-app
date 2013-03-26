// load mono api
require("../../api");

var net = require("net");
var startApp = require("./spawner");
var preventProxyCrash = function () {};

// application port cache
var runningApps = {};

// get the right host address, if no external proxy is available
if (!M.config.proxy) {
    
    M.config.host = M.util.ip();
    
    if (!M.config.host) {
        throw new Error("Missing IP Address");
    }
}

function proxyRequest (hostHeader, socket, buffer) {
 
    // the host of an application is the ip address where the application runs
    var appSocket = net.connect(runningApps[hostHeader].port, runningApps[hostHeader].host);
    appSocket.setKeepAlive(true);
    appSocket.on('error', function (err) {
        
        runningApps[hostHeader] = undefined;
        send(socket, 500, M.error.APP_SOCKET_RELOAD_MESSAGE);
    });
    
    // down stream
    appSocket.pipe(socket);
    // up stream
    socket.pipe(appSocket);
    
    appSocket.write(buffer);
    
    socket.resume();
}

function send (socket, status, msg) {
    
    socket.end(
        'HTTP/1.1 ' + status + '\r\n' +
        'Date: ' + new Date().toString() + '\r\n' +
        'Server: Mono Web Server\r\n' +
        'Content-Length: ' + msg.length + '\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
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
        console.error(err.message);
        console.error(err.stack);
        return process.exit(1);
    }
    
    process.exit();
}

// on user term/int or exception, kill all application processes and exit
process.on('SIGTERM', killAllApplications);
process.on('SIGINT', killAllApplications);
process.on('uncaughtException', killAllApplications);

// start proxy server
net.createServer(function(socket) {
    
    // set up piping on first data event
    socket.setKeepAlive(true);
    socket.once('data', function (buffer) {
        
        socket.pause();
        
        if (buffer.length >= 2048) {
            return send(socket, 414, 'Request-URI Too Long.\r\n' + buffer.toString('ascii'));
        }
        
        // get host
        var host = buffer.toString('ascii').match(/host\: *([a-z0-9:\.]*)/i);
        
        if (!host) {
            return send(socket, 400, 'No Host found in headers.\r\n' + buffer.toString('ascii'));
        }
        
        host = host[1].split(':')[0];
        
        if (runningApps[host] === null) {
            return send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (runningApps[host]) {
            return proxyRequest(host, socket, buffer);
        }

        runningApps[host] = null;
        
        startApp(host, runningApps, function (err, application) {
            
            if (err) {
                runningApps[host] = undefined;
                var statusCode;

                switch (err.code) {

                    case M.error.APP_NOT_FOUND:
                        statusCode = 404;

                    default:
                        statusCode = 500;
                }

                return send(socket, statusCode, err.message);
            }
            
            runningApps[host] = application;
            proxyRequest(host, socket, buffer);
        });
    });
    
    socket.on('error', preventProxyCrash);

}).listen(M.config.port, M.config.host);

