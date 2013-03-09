// load mono api
require(process.cwd() + '/api');

var fs = require("fs");

if (!M.config.argv || !M.config.argv.length) {
    console.error("Please provide a descriptor file as argument.");
    process.exit(1);
    return;
}

// TODO allow multiple application uninstalls
if (M.config.argv.length > 1) {
    var apps = "";
    for (var i in M.config.argv) {
        apps += M.config.argv[i] + ", ";
    }
    apps = apps.slice(0, -2);

    console.error("Currently I can only uninstall one application. You provided " + M.config.argv.length + ": " + apps);
    process.exit(2);
    return;
}

M.app.uninstall(M.config.argv[0], function(err, descriptor) {
    
    if (err) {
        console.error(err);
        console.error("Failed to uninstall application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
        process.exit(2);
        return;
    }
    

    console.log("Succesfully uninstalled application: " + descriptor.appId);

    M.app.install(M.config.argv[0], function(err, descriptor) {

        if (err) {
            console.error(err);
            console.error("Failed to install application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
            process.exit(2);
            return;
        }

        console.log("Succesfully installed application: " + descriptor.appId);
        process.exit();
    });
});
