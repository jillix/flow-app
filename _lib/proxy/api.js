// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

var argv = require('optimist');
var api_utils = require('../api/utils');

// TOOD read mono version from package.json
var version = 'v0.1.0';

function getConfig () {
    
    // default config
    var options = {
        "version": {
            "short": 'v',
            "description": 'print mono\'s version'
        },
        "deamon"        : {
            "value": false,
            "short": 'd',
            "description": 'start mono proxy with forever as a deamon'
        },
        "host" : {
            "short": 'h',
            "description": 'define a host (useful with a proxy)'
        },
        "log"           : {
            "value": __dirname + '/tmp/log.txt',
            "short": 'l',
            "description": 'specify a path for the log file'
        },
        "logTerm"       : {
            "value": false,
            "short": 't',
            "description": 'print output of the applications in the terminal'
        },
        "http"          : {
            "value": 8000,
            "description": 'http port'
        },
        "httpAppStart"     : {
            "value": 10000,
            "description": 'application http port range start'
        },
        "httpAppEnd"     : {
            "value": 14999,
            "description": 'application http port range end'
        },
        "ws"            : {
            "value": 8080,
            "description": 'websockets port'
        },
        "wsAppStart"       : {
            "value": 15000,
            "description": 'application websockets port range start'
        },
        "wsAppEnd"       : {
            "value": 19999,
            "description": 'application websockets port range end'
        },
        "attempts"      : {
            "value": 3,
            "description": 'number of attempts to restart a script'
        },
        "silent"        : {
            "value": true,
            "description": 'run the child script silencing stdout and stderr'
        },
        "minUptime"     : {
            "value": 2000,
            "description": 'minimum uptime (millis) for a script to not be considered "spinning"'
        },
        "spinSleepTime" : {
            "value": 1000,
            "description": 'time to wait (millis) between launches of a spinning script'
        },
        "help" : {
            "description": 'you\'re staring at it'
        }
    };
    
    // create default config
    var config = {};
    for (var defOption in options) {
        if (options[defOption].value) {
            config[defOption] = options[defOption].value;
        }
    }
    
    // set default cli options
    argv = argv.default(config).argv;
    
    // merge cli options
    for (var option in argv) {
        
        // ignore keys
        if (option === '_' || option === '$0') {
            continue;
        }
        
        // show version
        if (option === 'v' || option === 'version') {
            return version;
        }
        
        // show help
        if (option === 'help' || typeof options[option] === 'undefined') {
            return api_utils.help(
                'node start [options]',
                'The mono proxy server ' + version,
                options,
                'Documentation can be found at https://github.com/jillix/mono/',
                17
            );
        }
        
        // TODO check option value
        config[option] = argv[option];
    }
    
    // paths
    config.paths = {
        MONO_ROOT: __dirname,
        APPLICATION_ROOT: __dirname + 'apps/'
    };
    
    // get the right host address, if no host is set
    if (!config.host) {
        
        config.host = api_utils.ip();
        
        if (!config.host) {
            return 'Missing host';
        }
    }
}

module.exports = {
    config: getConfig(),
    proxy: {
        pipe: function (hostHeader, socket, buffer, ws) {
        
            // the host of an application is the ip address where the application runs
            var appSocket = net.connect(ws ? (M.cache.apps.cache[hostHeader].wsPort || 8888) : M.cache.apps.cache[hostHeader].port, M.cache.apps.cache[hostHeader].host);
            appSocket.setKeepAlive(true);
            appSocket.on('error', function (err) {
                
                M.cache.apps.rm(hostHeader);
                send(socket, 500, M.error.APP_SOCKET_RELOAD_MESSAGE);
            });
            
            // down stream
            appSocket.pipe(socket);
            // up stream
            socket.pipe(appSocket);
            
            appSocket.write(buffer);
            
            socket.resume();
        },
        send: function (socket, status, msg) {
            
            socket.end(
                'HTTP/1.1 ' + status + '\r\n' +
                'Date: ' + new Date().toString() + '\r\n' +
                'Server: Mono Web Server\r\n' +
                'Content-Length: ' + msg.length + '\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                '\r\n' + msg
            );
        },
        killEmAll: function (err) {
            
            for (var host in M.cache.apps.cache) {
                
                if (M.cache.apps.cache[host] && M.cache.apps.cache[host].pid) {
                    process.kill(M.cache.apps.cache[host].pid);
                }
            }
            
            if (err) {
                console.error(err.message);
                console.error(err.stack);
                return process.exit(1);
            }
            
            process.exit();
        }
    },
    spawner: {}
};

/*
// pahts
var MONO_ROOT = __dirname;
var paths = {};
paths.MONO_ROOT = MONO_ROOT;
paths.CONFIG_ROOT = MONO_ROOT + 'conf/';
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.API_ROOT = paths.MONO_ROOT + 'lib/api/';
paths.MODULE_ROOT = paths.MONO_ROOT + 'modules/';
paths.MODULE_DESCRIPTOR_NAME = 'mono.json';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/';
paths.APPLICATION_DESCRIPTOR_NAME = 'application.json';
paths.APPLICATION_MODULE_DIR_NAME = 'mono_modules';
*/

// check log level
// One of: none, error, warning, info, debug, verbose
/*if (!config.logLevel) {
    config.logLevel = "error";
} else {
    switch (config.logLevel) {
        case "none":
        case "error":
        case "warning":
        case "info":
        case "debug":
        case "verbose":
            break;
        default:
            throw new Error(config.logLevel + " is not a supported log level.");
    }
}*/
