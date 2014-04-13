var fs = require('fs');
var spawn = require('child_process').spawn;
var M = process.mono;

exports.start = startApp;

function getFromHost (host, callback) {
    
    // return if callback is not a function
    if (typeof callback !== 'function') {
        return;
    }
    
    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }
    
    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }

    if (typeof fields === 'function') {
        callback = fields;
        fields = null;
    }
    
    // TODO use a model instance to access find applications
    M.systemStore.collection(M.config.applicationModel).findOne({domains: host}, {fields: {process: 1, uid: 1, gid: 1, owner: 1}}, function (err, data) {
        
        if (err) {
            return callback(err);
        }
        
        if (!data || !data.process) {
            return callback(M.error(M.error.API_APP_NOT_FOUND, host));
        }
        
        data.process.id = data._id.toString();
        callback(null, data);
    });
}

function getPort (pid, callback) {
    
    var command = 'lsof';
    var child = spawn(command, ['-Pan', '-iTCP', '-sTCP:LISTEN', '-p' + pid]);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(M.error(M.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
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
            return callback(M.error(M.error.APP_PORT_NOT_FOUND, pid));
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
            return callback(M.error(M.error.APP_PORT_NOT_FOUND, pid));
        }

        callback(null, port);
    });
}

function getFreePort (callback) {
    
    var command = 'lsof';
    var child = spawn(command, ['-P', '-iTCP', '-sTCP:LISTEN']);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(M.error(M.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
        done = true;
    });

    var output = '';
    var freePort = M.config.appPortStart;

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

        var usedPorts = {}, i;
        for (i = 0, l = data.length; i < l; ++i) {
            usedPorts[parseInt(data[i].replace(/[^0-9]/g, ''), 10)] = 1;
        }

        // loop from start port to end port and find a hole in the usedPorts object
        for (i = M.config.appPortStart, l = M.config.appPortEnd; i < l; ++i) {
            if (!usedPorts[i]) {
                freePort = i;
                break;
            }
        }

        callback(freePort);
    });
}

function getPid (id, callback) {
    
    var command = 'pgrep';
    var child = spawn(command, ['-n', '-f', "node.*\\-\\-app " + id]);
    var done = false;

    // if this is not set and an error occurs, mono will be killed
    child.on('error', function(data) {
        callback(M.error(M.error.COMMAND_EXECUTION_FAILED, command, data.toString().trim()));
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
            return callback(M.error(M.error.APP_PID_NOT_FOUND, id));
        }

        // do we find more pids that match out search?
        var splits = output.split('\n');
        var multiple = false;
        var i = 1;
        for (i = 1; i < splits.length; i++) {
            if (splits[i]) {
                multiple = true;
            }
        }

        // report that there were multiple pids found
        if (multiple) {
            var pids = [];
            for (i = 0; i < splits.length; i++) {
                if (splits[i]) {
                    pids.push(splits[i]);
                }
            }
            return callback(M.error(M.error.APP_MULTIPLE_PROCESSES_FOUND, id, JSON.stringify(pids)));
        }

        // we are now sure we are answering with the only valid pid
        var pid = parseInt(splits[0], 10);
        callback(null, pid);
    });
}

// This MUST be called only ONCE per application process
function startApp (host, callback) {
    
    // establish the database connection
    getFromHost(host, function(err, dbApplication) {
        
        if (err) {
            return callback(err);
        }
        
        var application = dbApplication.process;
        
        // multiple-domain applications must be started only once
        var apps = M.cache.getAll();
        for (var _host in apps)  {
            if (apps[_host] && apps[_host].id === application.id) {
                return callback(null, apps[_host]);
            }
        }
        
        // get pid of running application
        getPid(application.id, function (err, pid) {

            if (err) {
                return callback(err);
            }

            if (pid) {

                // get the port of the running application
                return getPort(pid, function (err, port) {

                    if (err) {
                        if (err.code === 'APP_PORT_NOT_FOUND') {
                            err = M.error(M.error.API_SRV_APP_PORT_NOT_FOUND, application.id);
                        }
                        return callback(err);
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
                
                // save config for app process 
                application.port = freePort;
                application.dbHost = '127.0.0.1';
                application.dbPort = 27017;
                
                // spawn process with uid/gid and set the working directory to mono/users/uid/apps/appid/
                var spawnOptions = {
                    cwd: M.config.paths.USERS_ROOT + application.owner + '/apps/' + application.id + '/',
                    uid: dbApplication.uid,
                    gid: dbApplication.gid,
                    env: process.env
                };
                
                // stringify app config
                try {
                    spawnOptions.env.config = JSON.stringify(application);
                } catch (err) {
                    return callback(M.error(M.error.APP_PROCESS_ENV_JSON, application.id));
                }
                
                // spawn process
                var app = spawn('node', [M.config.paths.APPLICATION_SERVER], spawnOptions);
                
                // save process id in app cache
                application.pid = app.pid;
                
                // create writable log stream
                var appLogStream = fs.createWriteStream(M.config.paths.USERS_ROOT + application.owner + '/logs/' + application.name + '.txt');
                
                // log app output
                app.stdout.pipe(appLogStream);
                app.stderr.pipe(appLogStream);
                
                // get pid if app is running
                app.stdout.once('data', function (data) {
                    
                    // kill process if the sended data is not the app id
                    if (data.toString('ascii') !== application.id) {
                        app.kill();
                        return callback(M.error(M.error.APP_SPAWN_INVALID_RESPONSE, application.id, data.toString('ascii')));
                    }
                    
                    if (M.config.dev) {
                        console.log(' | application started.\n');
                    }
                    
                    return callback(null, application);
                });
                
                // handle app termination
                app.on('exit', function (code) {
                    callback(503, application.id);
                });
            });
        });
    });
}
