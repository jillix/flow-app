// load mono api
var net = require('net');
var M = require('./api');

// handle socket
function server (socket) {
    
    // set up piping on first data event
    socket.once('data', function (buffer) {
        
        // TODO test proxy for memory leaks
        socket.pause();
        
        // Info: read more from buffer, if there are a lot of 414 errors
        var host = buffer.toString('ascii', 0, 1000);
        
        // is the URL to long?
        if (host.indexOf('\n') > 2048) {
            return M.send(socket, 414, 'Request-URL Too Long.');
        }
        
        // TODO test for "Upgrade: websocket"
        //var ws = false;
        //if ((ws = host.match(/upgrade\:[ ]{1}websocket/i))) {
        //    ws = true;
        //}
        
        // get host
        if (!(host = host.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i))) {
            return M.send(socket, 400, 'No Host found in headers.');
        }
        host = host[1];
        
        // get application from cache
        var app = M.cache.get(host);
        if (app === null) {
            return M.send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (app) {
            return M.pipe(app, socket, buffer);
        }
        
        // mark application as "starting"
        M.cache.save(host, null);
        
        // start app
        M.startApp(host, function (err, application) {
            
            // handle error
            if (err) {
                
                // remove app from cache
                M.cache.rm(host);
                
                // set appropriate status code
                var statusCode = 500;
                if (err.code === M.error.APP_NOT_FOUND) {
                    statusCode = 404;
                }

                // send error
                return M.send(socket, statusCode, err.message);
            }
            
            // save app in cache
            M.cache.save(host, application);
            
            // pipe socket to application
            M.pipe(application, socket, buffer);
        });
    });
    
    // handle socket errors
    socket.on('error', function (err) {
        console.log(err.message);
    });
}

// wrap api function to preserve scope
function killApps (err) {
    M.killApps(err);
}

// on user term/int or exception, kill all application processes and exit
process.on('SIGTERM', killApps);
process.on('SIGINT', killApps);
process.on('uncaughtException', killApps);

// handle api errors
M.on('error', function (err) {
    throw new Error(err);
});

M.on('ready', function () {
    
    // start http proxy server
    net.createServer(server).listen(M.config.http, M.config.host);
    
    // TODO test ws over the port 80 with http (making a second server obsolete)
    // start ws proxy server
    //net.createServer(function (socket) {
    //    server(socket, true);
    //}).listen(M.config.ws, M.config.host);
});
