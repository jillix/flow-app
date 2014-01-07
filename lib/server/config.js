var os = require('os');
var fs = require('fs');
var path = require('path');
var argv = require('optimist');

// default mono db password
var defaultMonoPwd = '1234';

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.API_ROOT = paths.LIB_ROOT + 'api/';
paths.API_PUBLIC = paths.API_ROOT + 'public/';
paths.API_SERVER = paths.API_ROOT + 'server/';
paths.PROXY_SERVER = paths.LIB_ROOT + 'server/proxy.js';
paths.APPLICATION_SERVER = paths.LIB_ROOT + 'application/server.js';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/';

// extend js functionality
require(paths.API_PUBLIC + 'extend');

// read mono package
var mono = JSON.parse(fs.readFileSync(paths.MONO_ROOT + 'package.json'));

// define possible options with default value, short name and description
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
        "value": paths.MONO_ROOT + 'tmp/log.txt',
        "short": 'l',
        "description": 'specify a path for the log file'
    },
    "logTerm": {
        "value": false,
        "short": 't',
        "description": 'print output of the applications in the terminal'
    },
    "port": {
        "value": 8000,
        "description": 'port for http and websockets communication'
    },
    "appPortStart": {
        "value": 10001,
        "description": 'application port range start'
    },
    "appPortEnd": {
        "value": 19999,
        "description": 'application port range end'
    },
    "attempts": {
        "value": 3,
        "description": 'number of attempts to restart a script'
    },
    "silent": {
        "value": false,
        "description": 'run the child script silencing stdout and stderr'
    },
    "verbose": {
        "value": false,
        "description": 'run forver with verbose'
    },
    "minUptime": {
        "value": 2000,
        "description": 'minimum uptime (millis) for a script to not be considered "spinning"'
    },
    "spinSleepTime": {
        "value": 1000,
        "description": 'time to wait (millis) between launches of a spinning script'
    },
    "dbHost": {
        "value": '127.0.0.1',
        "description": 'host address for MongoDB'
    },
    "dbPort": {
        "value": 27017,
        "description": 'MongoDB port'
    },
    "help": {
        "description": 'you\'re staring at it'
    }
};

// define possible actions with description
var actions = {
    "start": 'start mono server (it\'s the same as without start)',
    "stop": 'stop mono server and applications'
};

// define considered environment variables with description
var environment = {
    "MONO_DB_PASSWORD": 'the password for the "server" user in the "mono" Mongo database'
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
    
    var row;
    
    if (actions) {
        text += '\n';
        text += 'actions:\n';
        
        // create actions
        for (var action in actions) {
            row = '  ' + action;
            
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
        row = '  ';
        
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
    text += 'environment variables:\n';

    // create environments
    for (var env in environment) {
        row = '  ' + env;
        
        if (environment[env]) {
            for (i = 0, l = (spaces - row.length + 1); i < l; ++i) {
                row += ' ';
            }
            row += environment[env];
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
        
        // check argv option value
        if (typeof options[option].value === typeof argv[option]) {
            config[option] = argv[option];
        }
    }
    
    // the mono database credentials come from the environment
    // default we have a test password
    if (!process.env.MONO_DB_PASSWORD) {
        console.log(
            'NOTE: You are running with the default password for the mono database: ' + defaultMonoPwd +
            '.\n      To overwrite it use the MONO_DB_PASSWORD environment variable.\n'
        );
        process.env.MONO_DB_PASSWORD = defaultMonoPwd;
    }
    
    // default mono db password
    config.dbPwd = process.env.MONO_DB_PASSWORD;
    
    // reset mono db password environment variable
    process.env.MONO_DB_PASSWORD = null;
    
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
