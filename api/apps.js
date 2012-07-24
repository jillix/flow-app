var fs = require("fs");

var orient = require(CONFIG.root + "/core/db/orient.js");
var modules = require(CONFIG.root + "/api/modules");
var db = require(CONFIG.root + "/core/model/orient.js");


function install(descriptor, callback) {

    switch (typeof descriptor) {
        case "string":
            installFromFile(descriptor, callback);
            break;
        case "object":
            installFromObject(descriptor, callback);
            break;
        default:
            callback("The descriptor must be either a path to a descriptor file or a descriptor object.");
    }
};

/**
 *
 */
function installFromFile(file, callback) {

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

        installFromObject(descriptor, callback);
    });
}

/**
 *
 */
function installFromObject(descriptor, callback) {

    // TODO validate the descriptor
    orient.connect(CONFIG.orient, function(err) {

        if (err) {
            return callback(err, descriptor.appId);
        }

        var initialCallback = callback;
        callback = function(err, result) {
            orient.disconnect(CONFIG.orient);
            initialCallback(err, result);
        };

        // **************
        // 1. APPLICATION
        // **************
        db.addApplication(
                descriptor.appId,
                descriptor.name || "Unnamed application",
                descriptor.routes || null,
                descriptor.publicDir || "",
                function(err, _id) {

            // TODO cleanup
            if (err) { return callback(err, descriptor.appId); }

            descriptor._id = _id;

            // ***************
            // 2. DEPENDENCIES
            // ***************
            installDependencies(descriptor, function(err, ids) {
                descriptor.modules = ids;

                // TODO cleanup
                if (err) { return callback(err, descriptor.appId); }

                // ********
                // 3. ROLES
                // ********
                installRoles(descriptor, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor.appId); }

                    // ********
                    // 4. USERS
                    // ********
                    installUsers(descriptor, function(err, publicUser) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor.appId); }

                        db.updatePublicUser(descriptor.appId, publicUser._id, function(err) {
                            if (err) {
                                console.error(err);
                            }
                        });

                        // *************
                        // 5. USER-ROLES
                        // *************
                        assignUserRoles(descriptor, function(err) {

                            // TODO cleanup
                            if (err) { return callback(err, descriptor.appId); }

                            // ************
                            // 6. ROLE USES
                            // ************
                            roleModuleUsage(descriptor, function(err) {

                                // TODO cleanup
                                if (err) { return callback(err, descriptor.appId); }

                                callback(null, descriptor.appId);
                            });
                        });
                    });
                });
            });
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
    var ids = [];
    var index = 0;

    for (var key in deps) {
        (function(key, index) {
            var splits = key.split("/");
            var module = new modules.Module(splits[0], splits[1], splits[2], deps[key]);

            modules.installModule(module, function(err, id) {
                if (err) {
                    console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                    console.error(JSON.stringify(err));
                    errors.push(err);
                } else if (id != undefined) {
                    console.log("Installed dependency: " + module.getVersionPath());
                }

                ids[index] = id;

                if (!--count) callback(errors.length ? errors : null, ids);
            })
        })(key, index++);
    }
}

/**
 *
 */
function installRoles(descriptor, callback) {

    if (!descriptor.roles) {
        return callback(null);
    }

    var roles = descriptor.roles;
    var count = roles.length;
    var errors = [];

    for (var i in roles) {
        (function(i) {
            var role = roles[i];

            db.addRole(descriptor.appId, role.name, function(err, _id) {

                if (err) {
                    errors.push(err);
                } else {
                    role._id = _id;
                }
                if (!--count) callback(errors.length ? errors : null);
            });
        })(i);
    }
}

/**
 *
 */
function installUsers(descriptor, callback) {

    if (!descriptor.users) {
        return callback(null);
    }

    var users = descriptor.users;
    var count = users.length;
    var errors = [];

    var publicUser = null;

    for (var i in users) {

        (function(user) {

            if (user.username === "") {
                if (!publicUser) {
                    publicUser = user;
                } else {
                    errors.push({ message: "There can be only one public user with an empty username.", data: user });
                    if (!--count) { return callback(errors); }
                }
            }

            // find the roles for this user
            var roles = [];
            var pseudoRoles = user.roles;
            for (var i in pseudoRoles) {
                var pseudoRole = pseudoRoles[i];
                for (var j in descriptor.roles) {
                    if (descriptor.roles[j].id == pseudoRole) {
                        roles.push(descriptor.roles[j]._id);
                    }
                }
            }

            // now add the user
            db.addUser(descriptor.appId, user, roles, function(err, _id) {

                if (err) {
                    errors.push(err);
                } else {
                    user._id = _id;
                }
                if (!--count) callback(errors.length ? errors : null, publicUser);
            });
        })(users[i]);
    }
}

/**
 *
 */
function assignUserRoles(descriptor, callback) {

    var users = descriptor.users;
    var roles = descriptor.roles;
    var uc = users.length;

    var userIndex = 0;
    var roleIndex = 0;

    function addRolesSequential(ui, ri) {
        if (ui >= uc) {
            return callback(null);
        }

        if (!users[ui].roles || ri >= users[ui].roles.length) {
            return addRolesSequential(++ui, 0);
        }

        db.assignRole(users[ui]._id, roles[users[ui].roles[ri]]._id, function() {
            addRolesSequential(ui, ++ri);
        });
    }

    addRolesSequential(userIndex, roleIndex);
}


/**
 *
 */
function roleModuleUsage(descriptor, callback) {

    console.log("TODO: Add roles module usage edges");

    callback(null);
}


exports.install = install;
exports.installDependencies = installDependencies;
exports.installUsers = installUsers;
exports.installRoles = installRoles;

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

