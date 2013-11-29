var fs = require('fs');
var spawn = require('child_process').spawn;

function getPort (pid, callback) {
    var self = this;
    
    var command = 'lsof';
    var child = spawn(command, ['-Pan', '-iTCP', '-sTCP:LISTEN', '-p' + pid]);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(self.error(self.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
        done = true;
    });

    var output = '';
    var port;

    child.stdout.on('data', function (data) {
        output += data.toString();
    });

    child.on('exit', function (code) {

        if (done) {
            return;
        }

        if (code) {
            return callback(self.error(self.error.APP_PORT_NOT_FOUND, pid));
        }
        
        var splits = output.split('\n');

        // filter empty lines and the port 5858 because this is the debugger
        for (var i in splits) {
            var match = splits[i].match(/:(\d*)\s\(LISTEN/);
            if (!match || match[1] == '5858') {
                continue;
            }
            port = parseInt(match[1], 10);
        }

        if (!port) {
            return callback(self.error(self.error.APP_PORT_NOT_FOUND, pid));
        }

        callback(null, port);
    });
}

// TODO get free port for websockets, or use http for websockets
function getFreePort (callback) {
    var self = this;
    
    var command = 'lsof';
    var child = spawn(command, ['-P', '-iTCP', '-sTCP:LISTEN']);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(self.error(self.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
        done = true;
    });

    var output = '';
    var freePort = self.config.httpAppStart;

    // listen to all the output (not only once)
    child.stdout.on('data', function (data) {
        output += data.toString();
    });

    // only when done, start processing the output
    child.on('exit', function (code) {

        if (done) {
            return;
        }

        // error, but not code 1 which means no result (in this case we return the port range start)
        if (code !== 0) {
            return callback(code === 1 ? freePort : 0);
        }

        var data = output.toString('ascii').match(/:(\d+)\s\(LISTEN/g) || [];

        var usedPorts = {};
        for (var i = 0, l = data.length; i < l; ++i) {
            usedPorts[parseInt(data[i].replace(/[^0-9]/g, ''), 10)] = 1;
        }

        // loop from start port to end port and find a hole in the usedPorts object
        for (var i = self.config.httpAppStart, l = self.config.httpAppEnd; i < l; ++i) {
            if (!usedPorts[i]) {
                freePort = i;
                break;
            }
        }

        callback(freePort);
    });
}

function getPid (id, callback) {
    var self = this;
    
    var command = 'pgrep';
    var child = spawn(command, ['-n', '-f', "node.*\\-\\-app " + id]);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(self.error(self.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
        done = true;
    });

    var output = '';

    child.stdout.on('data', function (data) {
        output += data.toString();
    });

    child.stderr.on('error', function (data) {
        console.error('Error while trying to find the pid for application "' + id + '"\nError: ' + data.toString().trim());
    });


    child.on('exit', function (code) {

        if (done) { return; }

        if (code === 1) {
            return callback(null, 0);
        } if (code) {
            return callback(self.error(self.error.APP_PID_NOT_FOUND, id));
        }

        // do we find more pids that match out search?
        var splits = output.split('\n');
        var multiple = false;
        for (var i = 1; i < splits.length; i++) {
            if (splits[i]) {
                multiple = true;
            }
        }

        // report that there were multiple pids found
        if (multiple) {
            var pids = [];
            for (var i = 0; i < splits.length; i++) {
                if (splits[i]) {
                    pids.push(splits[i]);
                }
            }
            return callback(self.error(self.error.APP_MULTIPLE_PROCESSES_FOUND, id, JSON.stringify(pids)));
        }

        // we are now sure we are answering with the only valid pid
        var pid = parseInt(splits[0], 10);
        callback(null, pid);
    });
}

// This MUST be called only ONCE per application process
function startApp (host, callback) {
    var self = this;
    
    // establish the database connection
    self.getFromHost(host, function(err, application) {
        
        if (err) {
            return callback(err);
        }
        
        // multiple-domain applications must be started only once
        var apps = self.cache.getAll();
        for (var _host in apps)  {
            if (apps[_host] && apps[_host]._id === application._id) {
                return callback(null, apps[_host]);
            }
        }
        
        // get pid of running application
        self.getPid(application._id, function (err, pid) {

            if (err) {
                return callback(err);
            }

            if (pid) {

                // get the port of the running application
                return self.getPort(pid, function (err, port) {

                    if (err) {
                        if (err.code === 'APP_PORT_NOT_FOUND') {
                            err = self.error(self.error.API_SRV_APP_PORT_NOT_FOUND, application._id);
                        }
                        return callback(err);
                    }
                    
                    application.port = port;
                    application.pid = pid;
                    
                    return callback(null, application);
                });
            }
            
            // get a free port
            self.getFreePort(function (freePort) {
                
                if (!freePort) {
                    return callback(self.error(self.error.APP_NO_FREE_PORT, application._id));
                }
                
                // TODO spawn process with uid/gid
                // http://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
                var app = spawn('node', [self.config.paths.APPLICATION_SERVER], {
                    //uid: '',
                    //gid: '',
                    env: {
                        app: application._id.toString(),
                        port: freePort,
                        host: application.host
                    }
                });
                
                // get pid if app is running
                app.stdout.once('data', function (data) {
                    
                    // kill process if the sended data is not the app id
                    if (data.toString('ascii') !== application._id.toString()) {
                        app.kill();
                        return callback(self.error(self.error.APP_SPAWN_INVALID_RESPONSE, application._id, data.toString('ascii')));
                    }
                    
                    // update application cache item
                    application.port = freePort;
                    application.pid = app.pid;
                    
                    // handle logTerm option
                    if (self.config.logTerm) {
                        app.stdout.pipe(process.stdout);
                        app.stderr.pipe(process.stderr);
                    }
                    
                    return callback(null, application);
                });
                
                // handle app termination
                app.on('exit', function (code) {
                    self.cache.rm(host);
                });
            });
        });
    });
}

exports.getPid = getPid;
exports.getPort = getPort;
exports.getFreePort = getFreePort;
exports.startApp = startApp;
