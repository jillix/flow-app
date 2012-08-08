// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var apps = require(CONFIG.root + "/api/apps");

var fs = require("fs");

if (process.argv.length < 3) {
    console.error("Please provide a descriptor file as argument.");
    return;
}

apps.install(process.argv[2], function(err, descriptor) {

    if (err) {
        console.error("Failed to install application: " + descriptor.appId);
        console.error(err);
        return;
    }

    console.log("Succesfully installed application: " + descriptor.appId);
});

