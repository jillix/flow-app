// load the mono configuration file
var config = module.exports = require("./mono");

function throwError(message) {
    throw new Error("ERROR: " + message);
}


// configure the root directory
config.root = __dirname;

// configure defaults


// log level
//      One of: error, warning, info, debug, none
//
if (!config.logLevel) {

    if (config.dev) {
        config.logLevel = "debug";
    }
    else {
        config.logLevel = "error";
    }
}
else {

    switch (config.logLevel) {
        case "error":
        case "warning":
        case "info":
        case "debug":
        case "none":
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

