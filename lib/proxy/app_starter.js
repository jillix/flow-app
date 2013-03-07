var fs = require("fs");
var util = require(CONFIG.root + "/lib/util");
var spawn = require("child_process").spawn;
var model = require(CONFIG.root + "/lib/model");

/*
 * This MUST be called only ONCE per application process
 */
function startApplication(host, socket, buffer, application, callback) {
    
    // TODO multiple-domain applications must be started only once
    if (!application.appId) {
        return callback(host, socket, buffer, 'No application ID found.');
    }

    var appPath = CONFIG.APPLICATION_ROOT + application.appId;

    // the application directory must be present
    // otherwise the piped streams below will crash the mono server
    if (!fs.existsSync(appPath)) {
        return callback(host, socket, buffer, "Application directory not found: " + application.appId);
    }
    
    // get pid of running application
    var pid;
    var getPid = spawn('pgrep', ['-f', application.appId]);
    
    getPid.stdout.once('data', function (data) {
        pid = parseInt(data.toString('ascii'), 10);
    });
    
    getPid.on('exit', function () {
        
        // if the app is already running
        if (pid) {
            
            // get port
            var port;
            var getPort = spawn('lsof', ['-Pan', '-iTCP', '-sTCP:LISTEN', '-p' + pid]);
            
            getPort.stdout.once('data', function (data) {
                port = parseInt(data.toString('ascii').match(/TCP\s[0-9\.]*:([0-9]*)\s\(LISTEN/)[1], 10);
            });
            
            getPort.on('exit', function () {
                
                if (!port) {
                    return callback(host, socket, buffer, 'No port found for running application: ' + application.appId);
                }
                
                // TODO link the app proccess to the proxy proccess, so when
                // the proxy terminates, the app proccess also gets killed
                application.port = port;
                application.pid = pid;
                return callback(host, socket, buffer, null, application);
            });
            
            return;
        }
        
        // get free port
        var freePort = 10001;
        var getUsedPort = spawn('lsof', ['-P', '-iTCP:10001-10999', '-sTCP:LISTEN']);
        getUsedPort.stdout.once('data', function (data) {
            
            // TODO get free port
            data = data.toString('ascii');
            console.log('get free port: ' + data);
            
        });
        
        getUsedPort.on('exit', function () {
            
            if (!freePort) {
                return callback(host, socket, buffer, 'No free port found for application: ' + application.appId);
            }
            
            var env = process.env;
            env.MONO_ROOT = CONFIG.root;
            var log = fs.createWriteStream(appPath + "/log.txt");
            var appResponse;
            
            // TODO link the app proccess to the proxy proccess, so when
            // the proxy terminates, the app proccess also gets killed
            var app = spawn('node', [
                CONFIG.root + '/lib/application/server.js',
                '--app', application.appId,
                '--port', freePort
            ]);
            
            // get pid if app is running
            app.stdout.once('data', function (data) {
                
                if (data.toString('ascii') !== application.appId) {
                    callback(host, socket, buffer, 'App spawn response error: ' + appResponse);
                }
                
                application.port = freePort;
                application.pid = app.pid;
                return callback(host, socket, buffer, null, application);
            });
            
            app.on('exit', function () {
                // TODO update orientdb
            });
            
            app.stdout.pipe(log);
            app.stderr.pipe(log);
        
            if (CONFIG.logTerm) {
                app.stdout.pipe(process.stdout);
                app.stderr.pipe(process.stderr);
            }
        });
    });
}

exports.startApp = startApplication;
