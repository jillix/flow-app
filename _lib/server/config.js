var os = require('os');
var fs = require('fs');
var path = require('path');
var argv = require('optimist');

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

var MONO_ROOT = path.normalize(__dirname + '/../../');
var paths = {
    MONO_ROOT: MONO_ROOT,
    PROXY_SERVER: MONO_ROOT + '_lib/server/proxy.js'
    // API (server)
    // PUBLIC_API
};

var mono = JSON.parse(fs.readFileSync(MONO_ROOT + 'package.json'));
var options = {
    "version": {
        "short": 'v',
        "description": 'print mono\'s version'
    },
    "dev": {
        "value": false,
        "short": 'd',
        "description": 'start mono proxy directly'
    },
    "host": {
        "short": 'h',
        "description": 'define a host (useful with a proxy)'
    },
    "log": {
        "value": paths.MONO_ROOT + '/tmp/log.txt',
        "short": 'l',
        "description": 'specify a path for the log file'
    },
    "logTerm": {
        "value": false,
        "short": 't',
        "description": 'print output of the applications in the terminal'
    },
    "http": {
        "value": 8000,
        "description": 'http port'
    },
    "httpAppStart": {
        "value": 10000,
        "description": 'application http port range start'
    },
    "httpAppEnd": {
        "value": 14999,
        "description": 'application http port range end'
    },
    "ws": {
        "value": 8080,
        "description": 'websockets port'
    },
    "wsAppStart": {
        "value": 15000,
        "description": 'application websockets port range start'
    },
    "wsAppEnd": {
        "value": 19999,
        "description": 'application websockets port range end'
    },
    "attempts": {
        "value": 3,
        "description": 'number of attempts to restart a script'
    },
    "silent": {
        "value": true,
        "description": 'run the child script silencing stdout and stderr'
    },
    "minUptime": {
        "value": 2000,
        "description": 'minimum uptime (millis) for a script to not be considered "spinning"'
    },
    "spinSleepTime": {
        "value": 1000,
        "description": 'time to wait (millis) between launches of a spinning script'
    },
    "help": {
        "description": 'you\'re staring at it'
    }
};
var actions = {
    "start": 'start mono server (it\'s the same as without start)',
    "stop": 'stop mono server and applications'
};

// create help info text
function help (usage, info, actions, options, more, spaces) {

    if (arguments.length !== 6) {
        return 'printHelp: Invalid arguments';
    }
    
    spaces = parseInt(spaces, 10) || 20;
    
    usage = usage.split('\n');
    
    var text = 'usage: ' + usage[0] + '\n';
    for (var i = 1, l = usage.length; i < l; ++i) {
        text += '       ' + usage[i] + '\n';
    }
    
    text += '\n';
    text += info + '\n';
    
    if (actions) {
        text += '\n';
        text += 'actions:\n';
        
        // create actions
        for (var action in actions) {
            var row = '  ' + action;
            
            if (actions[action]) {
                for (i = 0, l = (spaces - row.length); i < l; ++i) {
                    row += ' ';
                }
                row += actions[action];
            }
            
            text += row + '\n';
        }
    }
    
    text += '\n';
    text += 'options:\n';
    
    // create options
    for (var option in options) {
        var row = '  ';
        
        if (options[option].short) {
            row += '-' + options[option].short + ', ';
        }
        
        row += '--' + option;
        
        if (options[option].description) {
            for (i = 0, l = (spaces - row.length); i < l; ++i) {
                row += ' ';
            }
            row += options[option].description;
            
            if (typeof options[option].value !== 'undefined') {
                row += ' (' + options[option].value + ')';
            }
        }
        
        text += row + '\n';
    }
    
    text += '\n';
    text += more;
    
    return text;
}

// get host
function ip (version, internal) {
    
    var netIf = os.networkInterfaces();
    
    version = version || 4;
    internal = internal ? true : false;
    
    for (var netIfName in netIf) {
    
        for (var i = 0, l = netIf[netIfName].length; i < l; ++i) {
            
            if (
                netIf[netIfName][i] &&
                netIf[netIfName][i].internal == internal &&
                netIf[netIfName][i].family.toLowerCase() === "ipv" + version &&
                netIf[netIfName][i].address
            ) {
                
               return netIf[netIfName][i].address;
            }
        }
    }
    
    return null;
}

// create config
function getConfig () {
    
    var config = {};
    var helpText = help(
        'mono [actions] [options]',
        'The mono proxy server ' + mono.version,
        actions, options,
        'Documentation can be found at https://github.com/jillix/mono/',
        18
    );
    
    // create default config
    for (var defOption in options) {
        if (options[defOption].value) {
            config[defOption] = options[defOption].value;
        }
    }
    
    // set default cli options
    argv = argv.default(config).argv;
    
    // handle start and stop
    if (argv._[0] === 'stop') {
        return 'stop';
    } else if (argv._[0] && argv._[0] !== 'start') {
        return helpText;
    }
    
    // show version
    if (argv.v || argv.version) {
        return mono.version;
    }
    
    // merge cli options
    for (var option in argv) {
        
        // ignore keys
        if (option === '_' || option === '$0') {
            continue;
        }
        
        // try find long name
        if (typeof options[option] === 'undefined') {
            for (var long in options) {
                if (options[long].short === option) {
                    argv[long] = argv[option];
                    option = long;
                    break;
                }
            }
        }
        
        // show help
        if (option === 'help' || typeof options[option] === 'undefined') {
            return helpText;
        }
        
        // TODO check option value
        config[option] = argv[option];
    }
    
    // paths
    config.paths = paths;
    
    // pin dev mode to localhost
    if (config.dev) {
        config.host = '127.0.0.1';
    }
    
    // get the right host address, if no host is set
    if (!config.host) {
        
        config.host = ip();
        
        if (!config.host) {
            return 'Missing host';
        }
    }
    
    // save package infos in config
    config.mono = mono;
    
    return config;
}

module.exports = getConfig();
