var fs = require("fs");

var orient = require(CONFIG.root + "/core/db/orient");
var modules = require(CONFIG.root + "/api/modules");
var server = require(CONFIG.root + "/api/server");
var db = require(CONFIG.root + "/core/model/orient");


/**
 *
 */
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
function uninstall(descriptor, callback) {

    switch (typeof descriptor) {
        case "string":
            uninstallFromFile(descriptor, callback);
            break;
        case "object":
            uninstallFromObject(descriptor, callback);
            break;
        default:
            callback("The descriptor must be either a path to a descriptor file or a descriptor object.");
    }
};

/**
 *
 */
function installFromFile(file, callback) {

    server.readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        installFromObject(descriptor, callback);
    });
}

/**
 *
 */
function uninstallFromFile(file, callback) {

    server.readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        uninstallFromObject(descriptor, callback);
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
        if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
            console.log("Adding new application: " + descriptor.appId);
        }
        db.addApplication(
                descriptor.appId,
                descriptor.name || "Unnamed application",
                descriptor.routes || null,
                descriptor.publicDir || "",
                descriptor.error || null,
                descriptor.scripts || [],
                function(err, _id) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            descriptor._id = _id;

            // ************
            // 2.a. DOMAINS
            // ************
            if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                console.log("Adding domains for application: " + descriptor.appId);
            }
            installDomains(descriptor, function(err) {

                if (err) {
                    console.error("Failed to install domains for application: " + descriptor.appId + ". " + JSON.stringify(err));
                }
            });

            // *****************
            // 2.b. DEPENDENCIES
            // *****************
            if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                console.log("Installing dependencies for application: " + descriptor.appId);
            }
            installDependencies(descriptor, function(err, dependencies) {
                descriptor.dependencies = dependencies;

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // ********
                // 3. ROLES
                // ********
                if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                    console.log("Adding roles for application: " + descriptor.appId);
                }
                installRoles(descriptor, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // ********
                    // 4. USERS
                    // ********
                    if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                        console.log("Adding users for application: " + descriptor.appId);
                    }
                    installUsers(descriptor, function(err, publicUser) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor); }

                        // ********************
                        // 5.a. APP PUBLIC USER
                        // ********************
                        if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                            console.log("Configuring the public user for application: " + descriptor.appId);
                        }
                        db.updatePublicUser(descriptor.appId, publicUser._id, function(err) {
                            if (err) {
                                console.error(err);
                            }
                        });

                        // ***************
                        // 5.b. USER-ROLES
                        // ***************
                        if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                            console.log("Assigning user roles for application: " + descriptor.appId);
                        }
                        assignUserRoles(descriptor, function(err) {

                            // TODO cleanup
                            if (err) { return callback(err, descriptor); }

                            // ************
                            // 6. ROLE USES
                            // ************
                            if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                                console.log("Granting role access for application: " + descriptor.appId);
                            }
                            roleModuleUsage(descriptor, function(err) {

                                // TODO cleanup
                                if (err) { return callback(err, descriptor); }

                                // ******************
                                // 7. ROLE OPERATIONS
                                // ******************
                                if (CONFIG.log.applicationInstallation || CONFIG.logLevel === "verbose") {
                                    console.log("Adding role operations for application: " + descriptor.appId);
                                }
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
function uninstallFromObject(descriptor, callback) {

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

        // ******************
        // 1. GET APPLICATION
        // ******************
        db.getApplication(descriptor.appId, function(err, application) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            var aid = application.aid;

            // ***************
            // 2. DELETE USERS
            // ***************
            db.deleteUsers(aid, function(err) {

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // *********************
                // 3. DELETE ROLE ACCESS
                // *********************
                db.deleteRoles(aid, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // *********************
                    // 3. DELETE APPLICATION
                    // *********************
                    db.deleteApplication(aid, function(err) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor); }

                        callback(null, descriptor);
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
function cleanupApplicationDependencies(descriptor, callback) {

    server.removeDirectory(CONFIG.APPLICATION_ROOT + descriptor.appId + "/mono_modules", function(err) {

        if (err) { return callback; }

        server.removeDirectory(CONFIG.APPLICATION_ROOT + descriptor.appId + "/node_modules", callback);
    });
}

/**
 *
 */
function installDependencies(descriptor, callback) {

    console.log("Removing application dependencies");
    cleanupApplicationDependencies(descriptor, function(err) {

        if (err) {
            return callback(err);
        }

        // gather all dependencies
        var dependencies = {};
        for (var miid in descriptor.miids) {
            dependencies[descriptor.miids[miid].module] = -1;
        }

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

            modules.installModule(module, function(err, installedDependencies) {

                if (err) {
                    console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                    console.error(JSON.stringify(err));
                    errors.push(err);
                } else if (module._vid != undefined) {
                    console.log("Installed dependency: " + module.getVersionPath());

                    // add this module to the dependency list
                    dependencies[module.getVersionPath()] = module._vid;

                    // add sub-dependencies to this app dependencies
                    for (var key in installedDependencies) {
                        dependencies[key] = installedDependencies[key];
                    }
                }

                var appDependencies = {};
                appDependencies[module.getVersionPath()] = 1;
                for (var i in installedDependencies) {
                    appDependencies[i] = 1;
                }

                copyApplicationDependencies(descriptor, appDependencies, function(err) {

                    if (err) {
                        console.error("ERROR: " + JSON.stringify(err));
                        errors.push(err);
                    }

                    installDependenciesSequential(++index);
                });
            });
        }

        installDependenciesSequential(index);
    });
}

/**
 *
 */
function copyApplicationDependencies(descriptor, dependencies, callback) {

    var moduleRoot = CONFIG.MODULE_ROOT;
    var appModuleRoot = CONFIG.APPLICATION_ROOT + descriptor.appId + "/mono_modules/";
    var depKeys = Object.keys(dependencies);
    var count = depKeys.length;
    var errors = [];
    var index = 0;

    function copyApplicationDependenciesSequential(index) {

        if (index >= count) {
            return callback(null);
        }

        var key = depKeys[index];
        var splits = key.split("/");
        var module = new modules.Module(splits[0], splits[1], splits[2], splits[3]);
        var modulePath = moduleRoot + module.getVersionPath();

        if (fs.existsSync(appModuleRoot + depKeys[index])) {
            copyApplicationDependenciesSequential(++index);
            return;
        }

        server.copyDirectory(modulePath, appModuleRoot + module.getModulePath(), { createParents: true }, function(err) {

            if (err) {
                console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                console.error(JSON.stringify(err));
                errors.push(err);
            }

            copyApplicationDependenciesSequential(++index);
        });
    }

    copyApplicationDependenciesSequential(index);
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
    var errors = [];

    function addModuleInstanceUsesSequential(roleIndex) {

        if (roleIndex >= roleCount) {
            miidObj._ids = _ids;
            return callback(errors.length ? errors : null);
        }

        db.addModuleInstance(miid, descriptor.roles[roles[roleIndex]]._id, descriptor.dependencies[module], miidObj.config, function(err, id) {

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
    var module = descriptor.dependencies[miidObj.module];

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
            return callback(errors.length ? errors : null);
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


function getApplication(id, callback) {

    db.getApplication(id, function(err, app) {

        // TODO do not return all information, define an API !!!

        // TODO also get the application domains

        callback(err, app);
    });
}


function getApplications(callback) {
    db.getApplications(callback);
}


var cp = require("child_process");

function isApplicationRunning(appId, callback) {

    var apid = cp.spawn(CONFIG.root + "/admin/scripts/app_pid.sh", [appId]);

    var error = "";
    apid.stderr.on("data", function (data) {
        error += data.toString();
    });

    apid.on("exit", function(code) {
        switch (code) {
            case 0:
                return callback(null, true);
            case 1:
                return callback(null, false);
            default:
                return callback(error);
        }
    });
}


exports.install = install;
exports.uninstall = uninstall;
exports.installDependencies = installDependencies;
exports.installUsers = installUsers;
exports.installRoles = installRoles;

exports.getApplication = getApplication;
exports.getApplications = getApplications;
exports.isApplicationRunning = isApplicationRunning;

