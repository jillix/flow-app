// set up environment
require('./config');
var env = process.env;

var net = require('net');
var cache = require(env.Z_PATH_CACHE + 'cache');
var model = require(env.Z_PATH_MODELS + 'factory');

// get the process cache
var processCache = cache.pojo('process');

// start proxy server
net.createServer(server).listen(env.Z_PORT, function (err) {

    if (err) {
        return console.log('proxy error:', err);
    }

    console.log('proxy server running:', env.Z_PORT);
});

// handle socket
function server (socket) {

    // set up piping on first data event
    socket.once('data', function (buffer) {

        socket.pause();

        // Info: read more from buffer, if there are a lot of 414 errors
        var host = buffer.toString('ascii', 0, 1000);

        // is the URL to long?
        if (host.indexOf('\n') > 2048) {
            return send(socket, 414, new Error('Request-URL Too Long.'));
        }

        // get host
        if (!(host = host.match(/host\: *([a-z0-9\-_\.]+)(:[0-9]{2,5})?/i))) {
            return send(socket, 400, new Error('No Host found in headers.'));
        }
        host = host[1];

        // TODO use memcache or similar to save process data, then just pipe to
        //      process with info from cache

        // get process from cache
        var proc = processCache.get(host);
        if (proc === null) {
            return send(socket, 503, 'Info: Process is starting, Please reload.');
        }

        // proxy request
        if (proc) {
            return pipe(proc, socket, buffer);
        }

        // mark process as "starting"
        processCache.set(host, null);

        // get process infos
        getProcess(host, function (err, proc) {

            // handle error
            if (err || !proc) {

                // remove process from cache
                processCache.rm(host);

                // send error
                return send(socket, (err ? 500 : 404), err || new Error('Process not found.'));
            }

            // save process in cache for all hosts
            for (var i = 0; i < proc.domains.length; ++i) {
                processCache.set(proc.domains[i], proc);
            }

            // pipe socket to process
            pipe(proc, socket, buffer);
        });
    });

    // handle socket errors
    socket.on('error', function (err) {
        console.log('Proxy:', err);
    });
}

// get process data of an domain
function getProcess (domain, callback) {

    model.factory(env.Z_PROXY_PROCESSES, env.Z_PROXY_ROLE, function (err, processes) {

        if (err) {
            return callback(err);
        }

        // TODO implement wildcard domains (subdomains??)
        processes.request({m: 'findOne', q: {domains: domain}, fields: {_id: 0, domains: 1, host: 1, port: 1}}, function (err, proc) {

            if (err) {
                return callback(err);
            }

            callback(null, proc);
        });
    });
}

function pipe (proc, socket, buffer) {

    // the host of an process is the ip address where the process runs
    var processSocket = net.connect(proc.port, proc.host);
    processSocket.setKeepAlive(true);
    processSocket.on('error', function (err) {

        // remove process in cache for all hosts
        for (var i = 0; i < proc.domains.length; ++i) {
            processCache.rm(proc.domains[i]);
        }

        send(socket, 503, new Error('Service temporary unavailable.'));
    });

    // down stream
    processSocket.pipe(socket);
    // up stream
    socket.pipe(processSocket);

    processSocket.write(buffer);

    socket.resume();
}

function send (socket, status, msg) {

    socket.resume();
    socket.end(
        'HTTP/1.1 ' + status + '\r\n' +
        'Date: ' + new Date().toString() + '\r\n' +
        'Server: JCEP\r\n' +
        'Content-Length: ' + (msg ? msg.length : '0') + '\r\n' +
        'Connection: close\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        '\r\n' + status + ' [Proxy: ' + msg.toString() + ']'
    );
}
