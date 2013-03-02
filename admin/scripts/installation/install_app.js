// the mono configuration as global object
CONFIG = require(process.cwd() + "/core/config");

var apps = require(CONFIG.root + "/api/apps");

var fs = require("fs");

if (!CONFIG.argv || !CONFIG.argv.length) {
    console.error("Please provide a descriptor file as argument.");
    process.exit(1);
    return;
}

// TODO allow multiple application installs
if (CONFIG.argv.length > 1) {
    var apps = "";
    for (var i in CONFIG.argv) {
        apps += CONFIG.argv[i] + ", ";
    }
    apps = apps.slice(0, -2);

    console.error("Currently I can only install one application. You provided " + CONFIG.argv.length + ": " + apps);
    process.exit(2);
    return;
}

apps.install(CONFIG.argv[0], function(err, descriptor) {

    if (err) {
        console.error(err);
        console.error("Failed to install application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
        process.exit(2);
        return;
    }

    console.log("Succesfully installed application: " + descriptor.appId);
    process.exit();
});

