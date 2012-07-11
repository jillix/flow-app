var fs = require("fs");

var orient = require(CONFIG.root + "/core/db/orient.js");
var modules = require(CONFIG.root + "/api/modules");


function installApplication(descriptor, callback) {

    switch (typeof descriptor) {
        case "string":
            installApplicationFromFile(descriptor, callback);
            break;
        case "object":
            installApplicationFromObject(descriptor, callback);
            break;
        default:
            callback("The descriptor must be either a path to a descriptor file or a descriptor object.");
    }
};

/**
 *
 */
function installApplicationFromFile(file, callback) {

    fs.readFile(file, function (err, data) {

        if (err) {
            return callback("Error while reading the application descriptor file: " + file);
        }

        var descriptor = null;

        try {
            descriptor = JSON.parse(data);
        } catch (err) {
            var error = "Invalid descriptor file (" + file + "): " + data.toString();
            return callback(error);
        }

        installApplicationFromObject(descriptor, callback);
    });
}

/**
 *
 */
function installApplicationFromObject(descriptor, callback) {

    // TODO validate the descriptor

    orient.connect(CONFIG.orient, function() {

        installDependencies(descriptor, function(err) {

            // TODO why doesn't this script end anymore?
            orient.disconnect(CONFIG.orient);

            if (err) {
                // TODO cleanup
                return callback(err);
            }

            callback(null, descriptor.appId);
        });
    });
}

/**
 *
 */
function installDependencies(descriptor, callback) {

    if (!descriptor.dependencies) {
        return callback(null);
    }

    var deps = descriptor.dependencies;
    var moduleRoot = CONFIG.root + "/modules/";

    var count = Object.keys(deps).length;
    var errors = [];

    for (var i in deps) {
        (function(i) {
            var splits = i.split("/");
            var module = new modules.Module(splits[0], splits[1], splits[2], deps[i]);

            modules.installModule(module, function(err, newlyInstalled) {
                if (err) {
                    console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                    console.error(JSON.stringify(err));
                    errors.push(err);
                } else if (newlyInstalled) {
                    console.log("Installed dependency: " + module.getVersionPath());
                }

                if (!--count) callback(errors.length ? errors : undefined);
            })
        })(i);
    }
}


exports.installApplication = installApplication;
exports.installDependencies = installDependencies;

// = = = = = = = = = = = = = = = = = = = = 

//
// TODO is there a way to reserve IDs in Orient to poulate bulk import scripts?
//

/*
    Takes an application descriptor and deploys an application.
    If description.application.appId exists already, redeploy the app.
    If description.application.appId does not exists, deploy a new app.

    {
        application: {
            _id: ?
            appId:
        }
    }
*/
function deployApplication(descriptor, callback) {

}

/*
    Removes a deployed application havin the given appId.
*/
function undeployApplication(appId, callback) {

}

/*
    {
        users: [
            {
                _did: 1001
                _id: ?
                ...
            }
        ],
    }
*/
function createUsers(descriptor, callback) {

}

// = = = = = = = = = = = = = = = = = = = = 



