// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

var path = require('path');
var argv = require('optimist');
var MONO_ROOT = path.normalize(__dirname + '/../../');
var CONFIG_ROOT = MONO_ROOT + 'conf/';
var config = {};

// set config path
argv = argv.default('config', CONFIG_ROOT + 'dev_local.json').argv;

// load the mono configuration file
try {
    config = module.exports = require(argv.config);
} catch (err) {
    console.error("Invalid or missing configuration file: " + argv.config);
    console.error(err.toString());
    process.exit(1);
}

// set constants
config.MONO_ROOT = MONO_ROOT;
config.CONFIG_ROOT = CONFIG_ROOT;
config.MODULE_ROOT = config.MONO_ROOT + 'modules/';
config.MODULE_DESCRIPTOR_NAME = 'mono.json';
config.APPLICATION_ROOT = config.MONO_ROOT + 'apps/';
config.APPLICATION_DESCRIPTOR_NAME = 'application.json';
config.APPLICATION_MODULE_DIR_NAME = 'mono_modules';
config.log = config.log || {};
config.argv = argv._;

// save command line parameters in config
for (var i in argv) {
    if (i !== '_' && i !== '$0') {
        config[i] = argv[i];
    }
}

// log level
// One of: none, error, warning, info, debug, verbose
if (!config.logLevel) {
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
}

// admin Email
// Email address to send problems to.
// E.g.: if the server is restarted, etc.
if (config.adminEmail) {
    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (!filter.test(config.adminEmail)) {
        throw new Error("ERROR: Notification set active, but no valid mail has been set!");
    }
}

