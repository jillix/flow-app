// load the mono configuration file
var config = module.exports = require("./mono");

// configure the root directory
config.root = __dirname;

// configure defaults

// admin Email
//      Email address to send problems to.
//      E.g.: if the server is restarted, etc.
//
if (config.adminEmail) {

    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    
    if (!filter.test(config.adminEmail)) {
        throw new Error("Error: Notification set active, but no valid mail has been set!");
    }
}

