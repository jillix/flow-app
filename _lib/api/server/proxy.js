var net = require('net');

function pipe (app, socket, buffer) {
    var self = this;
    
    // the host of an application is the ip address where the application runs
    var appSocket = net.connect(app.port, app.host);
    appSocket.setKeepAlive(true);
    appSocket.on('error', function (err) {
        
        self.cache.rm(app.host);
        send(socket, 500, self.error.APP_SOCKET_RELOAD_MESSAGE);
    });
    
    // down stream
    appSocket.pipe(socket);
    // up stream
    socket.pipe(appSocket);
    
    appSocket.write(buffer);
    
    socket.resume();
}

function send (socket, status, msg) {
    
    socket.resume();
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
