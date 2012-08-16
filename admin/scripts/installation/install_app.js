// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var apps = require(CONFIG.root + "/api/apps");

var fs = require("fs");

if (process.argv.length < 3) {
    console.error("Please provide a descriptor file as argument.");
    process.exit(1);
    return;
}

apps.install(process.argv[2], function(err, descriptor) {

    if (err) {
        console.error(err);
        console.error("Failed to install application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
        process.exit(2);
        return;
    }

    console.log("Succesfully installed application: " + descriptor.appId);
    process.exit();
});

