var fs = require("fs");

var modules = require(CONFIG.root + "/api/modules");


function installApplication(descriptor, callback) {

    installDependencies(descriptor, function(err) {
        if (err) {
            // TODO cleanup
            return callback(err);
        }

        callback();
    });
}


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

            modules.installModule(module, function(err) {
                if (err) {
                    console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                    console.error(JSON.stringify(err));
                    errors.push(err);
                } else {
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



