var fs = require("fs");
var util = require(M.config.root + "/lib/util");
var spawn = require("child_process").spawn;

function getPid (appId, callback) {
    
    var pid;
    var getPid = spawn('pgrep', ['-f', appId]);
    
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
    
    var freePort = 10001;
    var getUsedPort = spawn('lsof', ['-P', '-iTCP:10001-10999', '-sTCP:LISTEN']);
    getUsedPort.stdout.once('data', function (data) {
        
        data = data.toString('ascii').match(/:(\d*)\s\(LISTEN/g);
        
        var obj = {};
        for (var i = 0, l = data.length; i < l; ++i) {
            obj[parseInt(data[i].replace(/[^0-9]/g, ''))] = 1;
        }
        
        for (var i = 10001, l = 11000; i < l; ++i) {
            if (!obj[i]) {
                return freePort = i;
            }
        }
    });
    
    getUsedPort.on('exit', function () {
        callback(freePort);
    });
}

// This MUST be called only ONCE per application process
function startApplication(host, runningApps, callback) {
    
    M.model.getDomainApplication(host, false, function(err, application) {
        
        if (err) {
            runningApps[host] = undefined;
            return callback([500, err.toString()]);
        }
        
        if (!application) {
            runningApps[host] = undefined;
            return callback([404, 'Application not found.']);
        }
        
        if (!application.appId) {
            return callback([500, 'No application ID found.']);
        }
        
        // multiple-domain applications must be started only once
        for (var _host in runningApps)  {
            if (runningApps[_host] && runningApps[_host].appId === application.appId) {
                return callback(null, application);
            }
        }
        
        var appPath = M.config.APPLICATION_ROOT + application.appId;
        
        // the application directory must be present
        // otherwise the piped streams below will crash the mono server
        if (!fs.existsSync(appPath)) {
            return callback([500, "Application directory not found: " + application.appId]);
        }
        
        // get pid of running application
        getPid(application.appId, function (pid) {
            
            if (pid) {
                
                // get the port of the running application
                return getPort(pid, function () {
                    
                    if (!port) {
                        return callback([500, 'No port found for running application: ' + application.appId]);
                    }
                    
                    application.port = port;
                    application.pid = pid;
                    return callback(null, application);
                });
            }
            
            // get a free port
            getFreePort(function (freePort) {
                
                if (!freePort) {
                    return callback([500, 'No free port found for application: ' + application.appId]);
                }
                
                var env = process.env;
                env.MONO_ROOT = M.config.root;
                var log = fs.createWriteStream(appPath + "/log.txt");
                
                var app = spawn('node', [
                    M.config.root + '/lib/application/server.js',
                    '--app', application.appId,
                    '--port', freePort
                ]);
                
                // get pid if app is running
                app.stdout.once('data', function (data) {
                    
                    if (data.toString('ascii') !== application.appId) {
                        callback([500, 'App spawn response error: ' + data.toString('ascii')]);
                    }
                    
                    application.port = freePort;
                    application.pid = app.pid;
                    return callback(null, application);
                });
                
                app.stdout.pipe(log);
                app.stderr.pipe(log);
                
                app.on('exit', function () {
                    runningApps[host] = undefined;
                });
            
                if (M.config.logTerm) {
                    app.stdout.pipe(process.stdout);
                    app.stderr.pipe(process.stderr);
                }
            });
        });
        
    });
}

module.exports = startApplication;
