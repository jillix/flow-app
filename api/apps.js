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
            return callback(err, descriptor);
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
                descriptor.error || null,
                function(err, _id) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            descriptor._id = _id;

            // ************
            // 2.a. DOMAINS
            // ************
            installDomains(descriptor, function(err) {

                if (err) {
                    console.error("Failed to install domains for application: " + descriptor + appId + ". " + JSON.stringify(err));
                }
            });

            // *****************
            // 2.b. DEPENDENCIES
            // *****************
            installDependencies(descriptor, function(err, ids) {
                descriptor.modules = ids;

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // ********
                // 3. ROLES
                // ********
                installRoles(descriptor, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // ********
                    // 4. USERS
                    // ********
                    installUsers(descriptor, function(err, publicUser) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor); }

                        // ********************
                        // 5.a. APP PUBLIC USER
                        // ********************
                        db.updatePublicUser(descriptor.appId, publicUser._id, function(err) {
                            if (err) {
                                console.error(err);
                            }
                        });

                        // ***************
                        // 5.b. USER-ROLES
                        // ***************
                        assignUserRoles(descriptor, function(err) {

                            // TODO cleanup
                            if (err) { return callback(err, descriptor); }

                            // ************
                            // 6. ROLE USES
                            // ************
                            roleModuleUsage(descriptor, function(err) {

                                // TODO cleanup
                                if (err) { return callback(err, descriptor); }

                                // ******************
                                // 7. ROLE OPERATIONS
                                // ******************
                                roleOperations(descriptor, function(err) {

                                    // TODO cleanup
                                    if (err) { return callback(err, descriptor); }

                                    callback(null, descriptor);
                                });
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
function installDomains(descriptor, callback) {

    if (!descriptor.domains || descriptor.domains.length == 0) {
        return callback(null);
    }

    db.addApplicationDomains(descriptor._id, descriptor.domains, callback);
}

/**
 *
 */
function installDependencies(descriptor, callback) {

    // gather all dependencies
    var dependencies = {};
    for (var miid in descriptor.miids) {
        dependencies[descriptor.miids[miid].module] = -1;
    }
    
    var moduleRoot = CONFIG.root + "/modules/";
    var depKeys = Object.keys(dependencies);
    var count = depKeys.length;
    var errors = [];
    var index = 0;

    function installDependenciesSequential(index) {

        if (index >= count) {
            return callback(null, dependencies);
        }

        var key = depKeys[index];
        var splits = key.split("/");
        var module = new modules.Module(splits[0], splits[1], splits[2], splits[3]);

        modules.installModule(module, function(err) {

            if (err) {
                console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                console.error(JSON.stringify(err));
                errors.push(err);
            } else if (module._vid != undefined) {
                console.log("Installed dependency: " + module.getVersionPath());

                // add this module to the dependency list
                dependencies[module.getVersionPath()] = module._vid;

                // add sub-dependencies to this app dependencies
                if (module.modules) {
                    for (var key in module.modules) {
                        dependencies[key] = module.modules[key];
                    }
                }
            }

            installDependenciesSequential(++index);
        })
    }

    installDependenciesSequential(index);
}

/**
 *
 */
function installRoles(descriptor, callback) {

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

    var miidObjs = descriptor.miids;
    var miids = Object.keys(miidObjs || {});
    var count = miids.length;
    var errors = [];

    function roleModuleUsageSequential(miidIndex) {

        if (miidIndex >= count) {
            return callback(errors.length ? errors : null);
        }

        var miid = miids[miidIndex];
        addModuleInstanceUses(descriptor, miid, miidObjs[miid], function(err) {

            if (err) {
                errors.push(err);
            }

            roleModuleUsageSequential(++miidIndex);
        });
    }

    roleModuleUsageSequential(0);
}

/**
 * This adds the EUsesInstanceOf edges between roles and module versions.
 */
function addModuleInstanceUses(descriptor, miid, miidObj, callback) {

    var roles = miidObj.roles || [];
    var module = miidObj.module;

    var roleCount = roles.length;

    if (!roleCount) {
        return callback(null);
    }

    var _ids = [];

    function addModuleInstanceUsesSequential(roleIndex) {

        if (roleIndex >= roleCount) {
            miidObj._ids = _ids;
            return callback(null);
        }

        db.addModuleInstance(miid, descriptor.roles[roles[roleIndex]]._id, descriptor.modules[module], miidObj.config, function(err, id) {

            if (err) {
                errors.push(err);
            } else {
                _ids.push(id);
            }

            addModuleInstanceUsesSequential(++roleIndex);
        });
    }

    addModuleInstanceUsesSequential(0);
}

/**
 *
 */
function roleOperations(descriptor, callback) {

    var miidObjs = descriptor.miids;
    var miids = Object.keys(miidObjs || {});
    var count = miids.length;
    var errors = [];

    function roleOperationsSequential(miidIndex) {

        if (miidIndex >= count) {
            return callback(errors.length ? errors : null);
        }

        var miid = miids[miidIndex];
        addModuleInstanceOperations(descriptor, miid, miidObjs[miid], function(err) {

            if (err) {
                errors.push(err);
            }

            roleOperationsSequential(++miidIndex);
        });
    }

    roleOperationsSequential(0);
}

/**
 * This adds the ECanPerform edges between roles and operations.
 */
function addModuleInstanceOperations(descriptor, miid, miidObj, callback) {

    var operations = miidObj.operations || [];
    var module = descriptor.modules[miidObj.module];

    // gather can perform operations
    var canPerforms = [];

    for (var key in operations) {

        var operation = operations[key];

        for (var i in operation.roles) {

            var role = operation.roles[i];

            var canPerform = {
                name: key,
                role: descriptor.roles[role]._id,
                params: operation.params[i]
            };
            canPerforms.push(canPerform);
        }
    }

    var count = canPerforms.length;
    var errors = [];

    if (!count) {
        return callback(null);
    }

    function addModuleInstanceOperationsSequential(index) {

        if (index >= count) {
            return callback(null);
        }

        var canPerform = canPerforms[index];

        db.addCanPerform(miid, canPerform.role, canPerform.name, canPerform.params, function(err, id) {

            if (err) {
                errors.push(err);
            }

            addModuleInstanceOperationsSequential(++index);
        });
    }

    addModuleInstanceOperationsSequential(0);
}


exports.install = install;
exports.installDependencies = installDependencies;
exports.installUsers = installUsers;
exports.installRoles = installRoles;

