var net = require('net');

function pipe (hostHeader, socket, buffer, ws) {
    var self = this;
    
    // the host of an application is the ip address where the application runs
    var app = self.cache.get(hostHeader);
    var appSocket = net.connect(ws ? app.wsPort : app.port, app.host);
    appSocket.setKeepAlive(true);
    appSocket.on('error', function (err) {
        
        self.cache.rm(hostHeader);
        send(socket, 500, self.error.APP_SOCKET_RELOAD_MESSAGE);
    });
    
    // down stream
    appSocket.pipe(socket);
    // up stream
    socket.pipe(appSocket);
    
    appSocket.write(buffer);
    
    socket.resume();
}

function send (socket, status, msg, ws) {
    
    if (ws) {
        // TODO handle websockets send
    }
    
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

function killApps (err) {
    var self = this;
    
    var apps = self.cache.getAll();
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

exports.pipe = pipe;
exports.send = send;
exports.killApps = killApps;
