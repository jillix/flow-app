var net = require('net');
var config = require('./config');
var cache = require(config.paths.CACHE + 'cache');
var model = require(config.paths.MODELS + 'factory');

// get the project cache
var projectCache = cache('projects');

// on user term/int or exception, kill all project processes and exit
process.on('SIGTERM', killProjects);
process.on('SIGINT', killProjects);
process.on('uncaughtException', killProjects);

// start proxy server
net.createServer(server).listen(config.port, function (err) {

    if (err) {
        return console.log('proxy error:', err);
    }

    console.log('proxy server running:', config.port);
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

        // get project from cache
        var project = projectCache.get(host);
        if (project === null) {
            return send(socket, 503, 'Info: Project is starting, Please reload.');
        }

        // proxy request
        if (project) {
            return pipe(project, socket, buffer);
        }

        // mark project as "starting"
        projectCache.save(host, null);

        // start project
        getProcess(host, function (err, process) {

            // handle error
            if (err || !process) {

                // remove project from cache
                projectCache.rm(host);

                // send error
                return send(socket, err ? 500 : 404, err || new Error('Project not found.'));
            }

            // save project in cache
            projectCache.save(host, process);

            // pipe socket to project
            pipe(process, socket, buffer);
        });
    });

    // handle socket errors
    socket.on('error', function (err) {
        console.log('Proxy:', err);
    });
}

// get process data of an domain
function getProcess (domain) {

    model.factory(config.processes, function (err, processes) {

        if (err) {
            return callback(err);
        }

        // TODO implement wildcard domains (subdomains??)
        processes.request({m: 'findOne', q: {domains: domain}, fields: {_id: 0, domains: 1, host: 1, port: 1}}, function (err, process) {

            if (err) {
                return callback(err);
            }

            callback(null, process);
        });
    });
}

function pipe (project, socket, buffer) {

    // the host of an project is the ip address where the project runs
    var projectSocket = net.connect(project.port, project.host);
    projectSocket.setKeepAlive(true);
    projectSocket.on('error', function (err) {

        projectCache.rm(project.host);
        send(socket, 500, err);
    });

    // down stream
    projectSocket.pipe(socket);
    // up stream
    socket.pipe(projectSocket);

    projectSocket.write(buffer);

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

function killProjects (err) {

    var projects = projectCache.getAll();
    for (var host in projects) {

        if (projects[host] && projects[host].pid) {
            process.kill(projects[host].pid);
        }
    }

    if (err) {
        console.error(err.message);
        console.error(err.stack);
        return process.exit(1);
    }

    process.exit();
}
