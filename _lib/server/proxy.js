// load mono api
var net = require('net');
var M = require('./api');

// handle socket
function server (socket, ws) {
    
    // set up piping on first data event
    socket.setKeepAlive(true);
    socket.once('data', function (buffer) {
        
        socket.pause();
        
        // Info: read more from buffer, if there are a lot of 414 errors
        var host = buffer.toString('ascii', 0, 1000);
        
        // is the URL to long?
        if (host.indexOf('\n') > 2048) {
            return M.server.send(socket, 414, 'Request-URL Too Long.');
        }
        
        // TODO test for "Upgrade: websocket"
        //console.log(bfrstr.match(/upgrade:[ ]{1}websocket/i));
        
        // get host
        host = host.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i);
        if (!host) {
            return M.server.send(socket, 400, 'No Host found in headers.');
        }
        host = host[0];
        
        // get application from cache
        app = M.server.cache.get(host);
        if (app === null) {
            return M.server.send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (app) {
            return M.server.pipe(app, socket, buffer, ws);
        }
        
        // mark application as "starting"
        M.server.cache.save(host, null);
        
        // start app
        M.server.startApp(host, function (err, application) {
            
            // handle error
            if (err) {
                
                // remove app from cache
                M.server.cache.rm(host);
                
                // set appropriate status code
                var statusCode = 500;
                if (err.code === M.server.error.APP_NOT_FOUND) {
                    statusCode = 404;
                }

                // send error
                return M.server.send(socket, statusCode, err.message);
            }
            
            // save app in cache
            M.server.cache.save(host, application);
            
            // pipe socket to application
            M.server.pipe(application, socket, buffer, ws);
        });
    });
    
    // handle socket errors
    socket.on('error', function (err) {
        M.server.send(socket, 500, err.message);
    });
}

// wrap api function to preserve scope
function killApps () {
    return function (err) {
        M.server.killApps(err);
    };
}

// handle api errors
M.on('error', function (err) {
    throw new Error(err);
});

M.on('ready', function () {
    
    // on user term/int or exception, kill all application processes and exit
    process.on('SIGTERM', killApps());
    process.on('SIGINT', killApps());
    process.on('uncaughtException', killApps());
    
    // start http proxy server
    net.createServer(server).listen(M.config.http, M.config.host);
    
    // TODO test ws over the port 80 with http (making a second server obsolete)
    // start ws proxy server
    //net.createServer(function (socket) {
    //    server(socket, true);
    //}).listen(M.config.ws, M.config.host);
});
