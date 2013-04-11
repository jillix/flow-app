var fs = require('fs');
var spawn = require('child_process').spawn;

function getPid (id, callback) {
    
    var pid;
    var getPid = spawn('pgrep', ['-f', id]);
    
    getPid.stdout.once('data', function (data) {
        pid = parseInt(data.toString('ascii'), 10);
    });
    
    getPid.on('exit', function () {
        callback(pid);
    });
}

function getPort (pid, callback) {
    
    var port;
    var getPort = spawn('lsof', ['-Pan', '-iTCP', '-sTCP:LISTEN', '-p' + pid]);
    
    getPort.stdout.once('data', function (data) {
        port = parseInt(data.toString('ascii').match(/:(\d*)\s\(LISTEN/)[1], 10);
    });
    
    getPort.on('exit', function () {
        callback(port);
    });
}

function getFreePort (callback) {
    
    var freePort = M.config.portRange[0];
    var getUsedPort = spawn('lsof', ['-P', '-iTCP:' + M.config.portRange.join('-'), '-sTCP:LISTEN']);
    getUsedPort.stdout.once('data', function (data) {
        
        data = data.toString('ascii').match(/:(\d*)\s\(LISTEN/g);
        
        var obj = {};
        for (var i = 0, l = data.length; i < l; ++i) {
            obj[parseInt(data[i].replace(/[^0-9]/g, ''))] = 1;
        }
        
        for (var i = M.config.portRange[0], l = M.config.portRange[1]; i < l; ++i) {
            if (!obj[i]) {
                freePort = i;
                break;
            }
        }
    });
    
    getUsedPort.on('exit', function (code) {
        
        if (code === 0 || code === 1) {
            return callback(freePort);
        }
        
        callback(0);
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

