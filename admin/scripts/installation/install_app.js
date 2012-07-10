// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var orient = require(CONFIG.root + "/core/db/orient.js");
var apps = require(CONFIG.root + "/api/apps");

var fs = require("fs");

if (process.argv.length < 3) {
    console.error("Please provide a descriptor file as argument.");
    return;
}

var descriptorFile = process.argv[2];

fs.readFile(descriptorFile, function (err, data) {

    if (err) {
        console.error("Error while reading the application descriptor file: " + descriptorFile);
        return;
    }

    var descriptor = null;

    try {
        descriptor = JSON.parse(data);
    } catch (err) {
        console.error("Invalid descriptor file (" + descriptorFile + "):");
        console.error(data.toString());
        return;
    }

    // TODO validate descriptor

    orient.connect(CONFIG.orient, function() {

        apps.installApplication(descriptor, function(err) {

            // TODO why doesn't this script end anymore?
            orient.disconnect(CONFIG.orient);

            if (err) {
                console.error("Failed to install app.");
                return;
            }

            console.log("Succesfully installed app.");
        });
    });
});
