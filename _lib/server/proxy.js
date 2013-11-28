// load mono api
var net = require("net");
var M = require('./api');

// handle socket
function server (socket, ws) {
    
    // set up piping on first data event
    socket.setKeepAlive(true);
    socket.once('data', function (buffer) {
        
        socket.pause();
        
        // Info: read more from buffer, if there are a lot of 414 errors
        var bfrstr = buffer.toString('ascii', 0, 1000);
        
        // is the URL to long?
        if (bfrstr.indexOf('\n') > 2048) {
            return M.server.send(socket, 414, 'Request-URL Too Long.\r\n' + buffer.toString('ascii'));
        }
        
        // TODO test for "Upgrade: websocket"
        //console.log(bfrstr.match(/upgrade:[ ]{1}websocket/i));
        
        // get host
        var host = bfrstr.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i);
        if (!host) {
            return M.server.send(socket, 400, 'No Host found in headers.\r\n' + buffer.toString('ascii'));
        }
        
        host = host[1];
        
        if (M.server.cache.get(host) === null) {
            return M.server.send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (M.server.cache.get(host)) {
            return M.server.pipe(host, socket, buffer, ws);
        }
        
        M.server.cache.save(host, null);
        
        M.server.startApp(host, function (err, application) {
            
            // TODO handle undefined err variable
            if (err || !application) {
                M.server.cache.rm(host);
                
                var statusCode;

                switch (err.code) {

                    case M.error.APP_NOT_FOUND:
                        statusCode = 404;
                        break;

                    default:
                        statusCode = 500;
                }

                return M.server.send(socket, statusCode, err.message);
            }
            
            M.server.cache.save(host, application);
            M.server.pipe(host, socket, buffer, ws);
        });
    });
    
    socket.on('error', function () {});
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
    net.createServer(function (socket) {
        server(socket, true);
    }).listen(M.config.ws, M.config.host);
});
