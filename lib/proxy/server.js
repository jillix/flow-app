// load mono api
require('./api')(function () {

    var net = require("net");
    var startApp = require("./spawner");

    // get the right host address, if no external proxy is available
    if (!M.config.proxy) {
        
        M.config.host = M.util.ip();
        
        if (!M.config.host) {
            throw new Error("Missing IP Address");
        }
    }

    function proxyRequest (hostHeader, socket, buffer, ws) {
     
        // the host of an application is the ip address where the application runs
        var appSocket = net.connect(ws ? (M.cache.apps.cache[hostHeader].wsPort || 8888) : M.cache.apps.cache[hostHeader].port, M.cache.apps.cache[hostHeader].host);
        appSocket.setKeepAlive(true);
        appSocket.on('error', function (err) {
            
            M.cache.apps.rm(hostHeader);
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
        
        for (var host in M.cache.apps.cache) {
            
            if (M.cache.apps.cache[host] && M.cache.apps.cache[host].pid) {
                process.kill(M.cache.apps.cache[host].pid);
            }
        }
        
        if (err) {
            console.error(err.message);
            console.error(err.stack);
            return process.exit(1);
        }
        
        process.exit();
    }
    
    function handleRequest (socket, ws) {
        
        // set up piping on first data event
        socket.setKeepAlive(true);
        socket.once('data', function (buffer) {
            
            socket.pause();

            // TODO check if 1kb is sufficient. A problem could be,
            // when there are a lot of cookie data or a get request
            // has a lot of parameters, and the host header is not on a top position.
            var bfrstr = buffer.toString('ascii', 0, 1000);
            
            
            
            // is the URL to long?
            if (bfrstr.indexOf('\n') > 2048) {
                return send(socket, 414, 'Request-URL Too Long.\r\n' + buffer.toString('ascii'));
            }

            // get host
            var host = bfrstr.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i);
            if (!host) {
                return send(socket, 400, 'No Host found in headers.\r\n' + buffer.toString('ascii'));
            }
            
            host = host[1];
            
            if (M.cache.apps.cache[host] === null) {
                return send(socket, 503, 'Application is starting...');
            }
            
            // proxy request
            if (M.cache.apps.cache[host]) {
                return proxyRequest(host, socket, buffer, ws);
            }
            
            M.cache.apps.save(host, null);
            
            startApp(host, function (err, application) {
                
                if (err) {
                    M.cache.apps.rm(host);
                    var statusCode;

                    switch (err.code) {

                        case M.error.APP_NOT_FOUND:
                            statusCode = 404;
                            break;

                        default:
                            statusCode = 500;
                    }

                    return send(socket, statusCode, err.message);
                }
                
                M.cache.apps.save(host, application);
                proxyRequest(host, socket, buffer, ws);
            });
        });
        
        socket.on('error', function () {});
    }
    
    // on user term/int or exception, kill all application processes and exit
    process.on('SIGTERM', killAllApplications);
    process.on('SIGINT', killAllApplications);
    process.on('uncaughtException', killAllApplications);

    // start http proxy server
    net.createServer(handleRequest).listen(M.config.port, M.config.host);
    
    // start ws proxy server
    net.createServer(function (socket) {
        handleRequest(socket, true);
    }).listen(M.config.wsPort || 8080, M.config.host);
});

