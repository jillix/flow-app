// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

var argv = require('optimist');

// TOOD mono versions
var version = 'v0.1.0';

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

function server () {
    
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
            console.log(version);
            return;
        }
        
        // show help
        if (option === 'help' || typeof options[option] === 'undefined') {
            console.log(printHelp(
                'node start [options]',
                'The mono proxy server ' + version,
                options,
                'Documentation can be found at https://github.com/jillix/mono/',
                17
            ));
            return;
        }
        
        // TODO check option value
        config[option] = argv[option];
    }
    
    // paths
    config.paths = {
        MONO_ROOT: __dirname,
        APPLICATION_ROOT: __dirname + 'apps/'
    };
    
    return config;
}

function application () {
    
}

exports.server = server;
exports.application = application;

function printHelp (usage, info, options, more, spaces) {
    
    if (arguments.length !== 5) {
        return 'printHelp: Invalid arguments';
    }
    
    spaces = parseInt(spaces, 10) || 20;
    
    usage = usage.split('\n');
    
    var text = 'Usage: ' + usage[0] + '\n';
    for (var i = 1, l = usage.length; i < l; ++i) {
        text += '       ' + usage + '\n';
    }
    
    text += '\n';
    text += info + '\n';
    text += '\n';
    text += 'Options:\n';
    
    for (var option in options) {
        var row = ' ';
        
        if (options[option].short) {
            row += '-' + options[option].short + ', ';
        }
        
        row += '--' + option;
        
        if (options[option].description) {
            for (i = 0, l = (spaces - row.length); i < l; ++i) {
                row += ' ';
            }
            row += options[option].description;
        }
        
        text += row + '\n';
    }
    
    text += '\n';
    text += more;
    
    return text;
}

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
