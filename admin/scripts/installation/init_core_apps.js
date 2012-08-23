// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var cp = require('child_process');
var fs = require('fs');

var appsApi = require(CONFIG.root + "/api/apps");
var model = require(CONFIG.root + "/core/model/orient");

var apps = fs.readdirSync(CONFIG.APPLICATION_ROOT);

var descriptorFiles = [];

for (var i in apps) {

    var appId = apps[i];
    var monoJson = CONFIG.APPLICATION_ROOT + appId + "/mono.json";

    if (appId.length == 32 && fs.existsSync(monoJson)) {
        descriptorFiles.push(monoJson);
    }
}

// recursive function to serialize the application installation
function installApp(i) {
    if (i < descriptorFiles.length) {

        console.log("-------------------");
        console.log("Installing application: " + descriptorFiles[i]);

        appsApi.install(descriptorFiles[i], function(err, descriptor) {

            if (err) {
                console.error(err);
                console.error("Failed to install application: " + descriptor.appId);
            } else {
                console.log("Succesfully installed application: " + descriptor.appId);
            }

            // install the next application
            installApp(++i);
        });
    }
}

// start the installation of all apps
installApp(0);

