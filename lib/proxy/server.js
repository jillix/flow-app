/*

TODO test proxy for memory leaks

*/
require('./api');
var M = process.mono;
var net = require('net');
var startApp = require('./spawner').start;

function pipe (app, socket, buffer) {
    
    // the host of an application is the ip address where the application runs
    var projectSocket = net.connect(app.port, app.host);
    projectSocket.setKeepAlive(true);
    projectSocket.on('error', function (err) {
        
        M.cache.projects.rm(app.host);
        send(socket, 500, M.error.APP_SOCKET_RELOAD_MESSAGE);
    });
    
    // down stream
    projectSocket.pipe(socket);
    // up stream
    socket.pipe(projectSocket);
    
    projectSocket.write(buffer);
    
    socket.resume();
}

// handle socket
function server (socket) {
    
    // set up piping on first data event
    socket.once('data', function (buffer) {

        socket.pause();
        
        // Info: read more from buffer, if there are a lot of 414 errors
        var host = buffer.toString('ascii', 0, 1000);
        
        // is the URL to long?
        if (host.indexOf('\n') > 2048) {
            return send(socket, 414, 'Request-URL Too Long.');
        }
        
        // get host
        if (!(host = host.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i))) {
            return send(socket, 400, 'No Host found in headers.');
        }
        host = host[1];
        
        // get application from cache
        var app = M.cache.projects.get(host);
        if (app === null) {
            return send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (app) {
            return pipe(app, socket, buffer);
        }
        
        // mark application as "starting"
        M.cache.projects.save(host, null);
        
        // start app
        startApp(host, function (err, application) {
            
            // handle error
            if (err) {
                
                // remove app from cache
                M.cache.projects.rm(host);
                
                // end socket connection
                if (err === 503) {
                    return send(socket, 503, '503 Application ' + application + ' unavailable');
                }
                
                // set appropriate status code
                var statusCode = 500;
                if (err.code === M.error.APP_NOT_FOUND) {
                    statusCode = 404;
                }

                // send error
                return send(socket, statusCode, err.toString());
            }
            
            // save app in cache
            M.cache.projects.save(host, application);
            
            // pipe socket to application
            pipe(application, socket, buffer);
        });
    });
    
    // handle socket errors
    socket.on('error', function (err) {
        console.log(err.message);
    });
}

function send (socket, status, msg) {
    
    socket.resume();
    socket.end(
        'HTTP/1.1 ' + status + '\r\n' +
        'Date: ' + new Date().toString() + '\r\n' +
        'Server: Mono Web Server\r\n' +
        'Content-Length: ' + (msg ? msg.length : '0') + '\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        '\r\n' + msg
    );
}

function killApps (err) {
    
    var apps = M.cache.projects.getAll();
    for (var host in apps) {
        
        if (apps[host] && apps[host].pid) {
            process.kill(apps[host].pid);
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
process.on('SIGTERM', killApps);
process.on('SIGINT', killApps);
process.on('uncaughtException', killApps);

// handle api errors
M.on('error', function (err) {
    throw new Error(err);
});

// start proxy server
net.createServer(server).listen(M.config.port, M.config.host);
