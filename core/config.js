var path = require('path');

// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
        
    // writeable: false, (default value)
    // enumerable: false, (default value)
    // configurable: false, (default value)
    value: function(){
        function O(){}
        O.prototype = this;
        return new O();
    }
});

// use optimist to parse the command line options
var DEFAULT_CONFIG_PATH = path.normalize(__dirname + "/../conf/dev_local.json").replace(/\/$/, '');
var argv = require("optimist")
    .default("config", DEFAULT_CONFIG_PATH)
    .argv;

// load the mono configuration file
var config = {};

try {
    config = module.exports = require(argv.config);
} catch (err) {
    console.error("Invalid or missing configuration file: " + DEFAULT_CONFIG_PATH);
    console.error(err.toString());
    process.exit(1);
}

config.log = config.log || {};

function throwError(message) {
    throw new Error("ERROR: " + message);
}

// process command line parameters
for (var i in argv) {
    switch (i) {
        case "_":
            config.argv = argv._;
        case "$0":
            continue;
        case "log":
            var splits = argv[i].toString().split(",");
            for (var j in splits) {
                config.log[splits[j].trim()] = true;
                //console.log("log." + splits[j] + "=true");
            }
            break;
        case "app":
            var appid = argv[i];
            //////////////////////////////////////////////////////////////
            // this converts a number back to string because optimist will
            // automatically parse arguments that lok like numbers 
            //
            function pad(number, length) {
                var str = '' + number;
                while (str.length < length) {
                    str = '0' + str;
                }
                return str;
            }
            if (!isNaN(Number(appid))) {
                appid = pad(appid, 32);
            }
            //
            //////////////////////////////////////////////////////////////
            config.app = appid;
            break;
        case "port":
            config.port = argv[i];
            break;
        case "proxy":
            config.proxy = argv[i];
            break;
        default:
            config[i] = true;
            //console.log(i + "=" + argv[i]);
    }
}

// configure the root directory
config.root = path.normalize(__dirname + "/../").replace(/\/$/, '');;

// configure defaults


// log level
//      One of: none, error, warning, info, debug, verbose
//
config.logLevel = argv.logLevel || config.logLevel;
if (!config.logLevel) {
    
    config.logLevel = "error";
}
else {
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
}


// admin Email
//      Email address to send problems to.
//      E.g.: if the server is restarted, etc.
//
if (config.adminEmail) {

    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    
    if (!filter.test(config.adminEmail)) {
        throw new Error("ERROR: Notification set active, but no valid mail has been set!");
    }
}


// OrientDB connection
//
config.orient || throwError("The OrientDB configuration is missing");
config.orient.server || throwError("The OrientDB configuration is missing the server key");
config.orient.db || throwError("The OrientDB configuration is missing the db key");

// Constants
//
config.MODULE_ROOT = config.root + "/modules/";
config.APPLICATION_ROOT = config.root + "/apps/";

if (!config.app && (argv.dev === true || config.logLevel === "debug")) {
    console.log("Using configuration file: " + argv.config);
}

