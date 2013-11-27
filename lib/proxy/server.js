// load mono api
var net = require("net");
var M = require('../../_lib/proxy/api');
var startApp = require("./spawner");

console.log(M);

function server (socket, ws) {
    
    // set up piping on first data event
    socket.setKeepAlive(true);
    socket.once('data', function (buffer) {
        
        socket.pause();
        
        // Info: read more from buffer, if there are a lot of 414 errors
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
        
        if (M.apps.cache[host] === null) {
            return send(socket, 503, 'Application is starting...');
        }
        
        // proxy request
        if (M.apps.cache[host]) {
            return M.proxy.pipe(host, socket, buffer, ws);
        }
        
        M.apps.save(host, null);
        
        startApp(host, function (err, application) {
            
            if (err) {
                M.apps.rm(host);
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
            
            M.apps.save(host, application);
            M.proxy.pipe(host, socket, buffer, ws);
        });
    });
    
    socket.on('error', function () {});
}

// on user term/int or exception, kill all application processes and exit
process.on('SIGTERM', M.proxy.killEmAll);
process.on('SIGINT', M.proxy.killEmAll);
process.on('uncaughtException', M.proxy.killEmAll);

// start http proxy server
net.createServer(server).listen(M.config.http, M.config.host);

// start ws proxy server
net.createServer(function (socket) {
    server(socket, true);
}).listen(M.config.ws, M.config.host);
