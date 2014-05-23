var os = require('os');
var fs = require('fs');
var path = require('path');
var argv = require('optimist');

// create paths
var paths = {MONO_ROOT: path.normalize(__dirname + '/../../')};
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.PROXY_SERVER = paths.LIB_ROOT + 'proxy/server.js';
paths.PROJECT_SERVER = paths.LIB_ROOT + 'project/server.js';
paths.USERS_ROOT = paths.MONO_ROOT + 'users/';
paths.MODELS = paths.LIB_ROOT + 'models/';
paths.STORES = paths.LIB_ROOT + 'stores/';

// TOOD get this config from a file or the environment
var admin = {
    owner: '530639e09060f4703737e017',
    apiKey: '0ULtAr8iH151p69q2XYTCht',
    project: '53078e9fe266dbc030ef890c'
};

//var projectModel = 'm_projects';
var storeConfig = {
    storesCollection: 'm_stores',
    systemDbPrefix: 'project_',
    systemStoreName: 'system',
    systemAdapter: 'mongodb',
    systemConfig: {
        host: 'localhost',
        port: '27017',
        database: 'project_' + admin.project
    }
};

// extend js functionality
require(paths.LIB_ROOT + 'utils/extend');

// read mono package
var mono = JSON.parse(fs.readFileSync(paths.MONO_ROOT + 'package.json'));

// define possible options with default value, short name and description
var options = {
    "version": {
        "short": 'v',
        "description": 'print mono\'s version'
    },
    "host": {
        "value": '',
        "short": 'h',
        "description": 'define a host (useful with a proxy)'
    },
    "log": {
        "value": paths.MONO_ROOT + 'tmp/log.txt',
        "short": 'l',
        "description": 'specify a path for the log file'
    },
    "port": {
        "value": 8000,
        "description": 'port for http and websockets communication'
    },
    "appPortStart": {
        "value": 10001,
        "description": 'process port range start'
    },
    "appPortEnd": {
        "value": 19999,
        "description": 'process port range end'
    },
    "attempts": {
        "value": 3,
        "description": 'number of attempts to restart a script'
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

// define possible actions with description
var actions = {
    "start": 'start proxy server (it\'s the same as without "start")',
    "stop": 'stop mono proxy and processes'
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
    text += more;
    text += '\n';
    
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
    
    // paths
    config.paths = paths;
    
    // get the right host address, if no host is set
    if (!config.host) {
        
        config.host = ip();
        
        if (!config.host) {
            return 'Missing host';
        }
    }
    
    // save store config
    config.store = storeConfig;
    
    // save projects model name
    //config.projectModel = projectModel;
    
    // save package infos in config
    config.mono = mono;
    
    // owner and apiKey
    config.owner = admin.owner;
    config.apiKey = admin.apiKey;
    
    return config;
}

module.exports = getConfig();
