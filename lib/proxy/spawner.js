var fs = require('fs');
var spawn = require('child_process').spawn;

function getPid (id, callback) {

    var command = 'pgrep';
    var pid;
    var child = spawn(command, ['-f', "node.*\\-\\-app " + id]);

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        throw new Error('Failed to execute command: ' + command + '\nError: ' + data.toString());
    });

    // TODO make this bullet-proof: what if more than one process is found? error or which?
    child.stdout.on('data', function (data) {
        pid = parseInt(data.toString('ascii'), 10);
    });

    child.stderr.on('error', function (data) {
        console.error('Error while trying to find the pid for application: ' + id)
        console.error(data.toString());
    });

    child.on('exit', function (code) {
        callback(pid);
    });
}

function getPort (pid, callback) {

    var command = 'lsof';
    var port;
    var child = spawn(command, ['-Pan', '-iTCP', '-sTCP:LISTEN', '-p' + pid]);

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        throw new Error('Failed to execute command: ' + command + '\nError: ' + data.toString());
    });

    child.stdout.once('data', function (data) {
        port = parseInt(data.toString('ascii').match(/:(\d*)\s\(LISTEN/)[1], 10);
    });

    child.on('exit', function () {
        callback(port);
    });
}

function getFreePort (callback) {

    var command = 'lsof';
    var child = spawn('lsof', ['-P', '-iTCP', '-sTCP:LISTEN']);

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        throw new Error('Failed to execute command: ' + command + '\nError: ' + data.toString());
    });

    var dataOut = '';
    var freePort = M.config.portRange[0];

    // listen to all the output (not only once)
    child.stdout.on('data', function (data) {
        dataOut += data.toString();
    });

    // only when done, start processing the output
    child.on('exit', function (code) {

        // error, but not code 1 which means no result (in this case we return the port range start)
        if (code !== 0) {
            return callback(code === 1 ? freePort : 0);
        }

        data = dataOut.toString('ascii').match(/:(\d+)\s\(LISTEN/g);

        var usedPorts = {};
        for (var i = 0, l = data.length; i < l; ++i) {
            usedPorts[parseInt(data[i].replace(/[^0-9]/g, ''))] = 1;
        }

        // loop from start port to end port and find a hole in the usedPorts object
        for (var i = M.config.portRange[0], l = M.config.portRange[1]; i < l; ++i) {
            if (!usedPorts[i]) {
                freePort = i;
                break;
            }
        }

        callback(freePort);
    });
}

// This MUST be called only ONCE per application process
function startApplication(host, runningApps, callback) {

    // establish the database connection
    M.app.getFromHost(host, {
        id: 1,
        host: 1,
        publicRole: 1,
        publicDir: 1,
        routes: 1,
        errors: 1,
        title: 1,
        locale: 1,
        favicon: 1
    }, function(err, application) {

        if (err) {
            return callback(err);
        }
        
        var publicRole = parseInt((application.publicRole || '').split(':')[1]);
        if (isNaN(publicRole)) {
            // TODO handle this error with M.error()
            return callback(new Error('This application cannot run without a public role'));
        }
        
        // multiple-domain applications must be started only once
        for (var _host in runningApps)  {
            if (runningApps[_host] && runningApps[_host].id === application.id) {
                return callback(null, runningApps[_host]);
            }
        }
        
        var appPath = M.config.APPLICATION_ROOT + application.id;
        
        // the application directory must be present otherwise the piped
        // streams below will crash the mono proxy server
        if (!fs.existsSync(appPath)) {
            return callback(M.error(M.error.APP_DIR_NOT_FOUND, appPath));
        }
        
        // get pid of running application
        getPid(application.id, function (pid) {

            application = {
                id: application.id,
                host: application.host || '127.0.0.1',
                publicRole: publicRole,
                publicDir: application.publicDir,
                session: application.session,
                routes: application.routes,
                errors: application.errors,
                title: application.title,
                locale: application.locale,
                favicon: application.favicon || 'favicon.ico'
            };

            if (pid) {
                
                // get the port of the running application
                return getPort(pid, function (port) {
                    
                    if (!port) {
                        return callback(M.error(M.error.APP_PORT_NOT_FOUND, application.id));
                    }
                    
                    application.port = port;
                    application.pid = pid;
                    
                    return callback(null, application);
                });
            }
            
            // get a free port
            getFreePort(function (freePort) {

                if (!freePort) {
                    return callback(M.error(M.error.APP_NO_FREE_PORT, application.id));
                }

                var log = fs.createWriteStream(appPath + '/log.txt');
                var app = spawn('node', [
                    M.config.root + '/lib/application/server.js',
                    '--app', application.id,
                    '--port', freePort,
                    '--host', application.host
                ]);
                
                // get pid if app is running
                app.stdout.once('data', function (data) {
                    if (data.toString('ascii') !== application.id) {
                        // TODO kill the process in this case
                        return callback(M.error(M.error.APP_SPAWN_INVALID_RESPONSE, application.id, data.toString('ascii')));
                    }
                    
                    application.port = freePort;
                    application.pid = app.pid;
                    
                    if (M.config.logTerm) {
                        app.stdout.pipe(process.stdout);
                        app.stderr.pipe(process.stderr);
                    }
                    
                    return callback(null, application);
                });

                app.stderr.on('data', function (data) {
                    console.error(data.toString().trim());
                });
                
                app.stdout.pipe(log);
                app.stderr.pipe(log);
                
                app.on('exit', function (code) {
                    if (code) {
                        console.error('Application ' + application.id + ' finished with code: ' + code);
                    }
                    runningApps[host] = undefined;
                });
            });
        });
        
    });
}

module.exports = startApplication;

