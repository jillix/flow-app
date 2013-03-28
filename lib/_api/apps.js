var fs = require("fs");

/**
 *
 */
function readDescriptor(path, callback) {

    fs.readFile(path, function (err, data) {

        if (err) {
            return callback("Error while reading the descriptor file: " + path);
        }

        var descriptor = null;

        try {
            descriptor = JSON.parse(data);
        } catch (err) {
            var error = "Invalid descriptor file (" + path + "): " + data.toString();
            return callback(error);
        }

        callback(null, descriptor);
    });
}

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

    readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        installFromObject(descriptor, callback);
    });
}

/**
 *
 */
function uninstallFromFile(file, callback) {

    readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        uninstallFromObject(descriptor, callback);
    });
}

/**
 *
 */
function installFromObject(descriptor, callback) {

    // TODO validate the descriptor
    M.orient.connect(function(err) {

        if (err) {
            return callback(err, descriptor);
        }

        var initialCallback = callback;
        callback = function(err, result) {
            initialCallback(err, result);
        };

        // **************
        // 1. APPLICATION
        // **************
        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
            console.log("Adding new application: " + descriptor.appId);
        }
        M.model.addApplication(
                descriptor.appId,
                descriptor.name || "Unnamed application",
                descriptor.routes || null,
                descriptor.publicDir || "",
                descriptor.session || false,
                descriptor.error || null,
                descriptor.scripts || [],
                descriptor.language || null,
                function(err, _id) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            descriptor._id = _id;

            // ************
            // 2.a. DOMAINS
            // ************
            if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
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
            if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                console.log("Installing dependencies for application: " + descriptor.appId);
            }
            installDependencies(descriptor, function(err, dependencies) {
                descriptor.dependencies = dependencies;

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // ********
                // 3. ROLES
                // ********
                if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                    console.log("Adding roles for application: " + descriptor.appId);
                }
                installRoles(descriptor, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // ********
                    // 4. USERS
                    // ********
                    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                        console.log("Adding users for application: " + descriptor.appId);
                    }
                    installUsers(descriptor, function(err, publicUser) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor); }

                        // ********************
                        // 5.a. APP PUBLIC USER
                        // ********************
                        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                            console.log("Configuring the public user for application: " + descriptor.appId);
                        }
                        M.model.updatePublicUser(descriptor.appId, publicUser._id, function(err) {
                            if (err) {
                                console.error(err);
                            }
                        });

                        // ***************
                        // 5.b. USER-ROLES
                        // ***************
                        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                            console.log("Assigning user roles for application: " + descriptor.appId);
                        }
                        assignUserRoles(descriptor, function(err) {

                            // TODO cleanup
                            if (err) { return callback(err, descriptor); }

                            // ************
                            // 6. ROLE USES
                            // ************
                            if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                                console.log("Granting role access for application: " + descriptor.appId);
                            }
                            roleModuleUsage(descriptor, function(err) {

                                // TODO cleanup
                                if (err) { return callback(err, descriptor); }

                                // ******************
                                // 7. ROLE OPERATIONS
                                // ******************
                                if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
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
    M.orient.connect(function(err) {

        if (err) {
            return callback(err, descriptor);
        }

        var initialCallback = callback;
        callback = function(err, result) {
            initialCallback(err, result);
        };

        // ******************
        // 1. GET APPLICATION
        // ******************
        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
            console.log("Finding application: " + descriptor.appId);
        }
        M.model.getApplication(descriptor.appId, function(err, application) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            var aid = application.aid;

            // ***************
            // 2. DELETE USERS
            // ***************
            if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                console.log("Deleting application users ...");
            }
            M.model.deleteUsers(aid, function(err) {

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // ***************
                // 3. DELETE ROLES
                // ***************
                if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                    console.log("Deleting application roles ...");
                }
                M.model.deleteRoles(aid, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // *****************
                    // 4. DELETE DOMAINS
                    // *****************
                    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                        console.log("Deleting application domains ...");
                    }
                    M.model.deleteApplicationDomains(descriptor.appId, function(err) {

                        // TODO cleanup
                        if (err) { return callback(err, descriptor); }

                        // *********************
                        // 5. DELETE APPLICATION
                        // *********************
                        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                            console.log("Deleting application ...");
                        }
                        M.model.deleteApplication(descriptor.appId, function(err) {

                            // TODO cleanup
                            if (err) { return callback(err, descriptor); }

                            callback(null, descriptor);
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

    M.model.addApplicationDomains(descriptor._id, descriptor.domains, callback);
}

/**
 *
 */
function cleanupApplicationDependencies(descriptor, callback) {

    M.dir.removeDirectory(M.config.APPLICATION_ROOT + descriptor.appId + "/mono_modules", function(err) {

        if (err) { return callback; }

        M.dir.removeDirectory(M.config.APPLICATION_ROOT + descriptor.appId + "/node_modules", callback);
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
            var module = new M.module.Module(splits[0], splits[1], splits[2], splits[3]);

            M.module.installModule(module, function(err, installedDependencies) {

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
            M.model.addUser(descriptor.appId, user, roles, function(err, _id) {

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

        M.model.assignRole(users[ui]._id, roles[users[ui].roles[ri]]._id, function() {
            addRolesSequential(ui, ++ri);
        });
    }

    addRolesSequential(userIndex, roleIndex);
}


function getApplication(id, callback) {

    M.model.getApplication(id, function(err, app) {

        // TODO do not return all information, define an API !!!

        // TODO also get the application domains

        callback(err, app);
    });
}


function getApplicationDomains(id, callback) {

    M.model.getApplicationDomains(id, function(err, domains) {

        callback(err, domains);
    })
}


function getApplications(callback) {
    M.model.getApplications(callback);
}


var cp = require("child_process");

function isApplicationRunning(appId, callback) {
    
    var apid = cp.spawn('pgrep', ['-f', appId]);
    
    var pid = '';
    apid.stdout.on('data', function () {
        pid += data.toString('ascii');
    });
    
    var error = "";
    apid.stderr.on("data", function (data) {
        error += data.toString();
    });

    apid.on("exit", function(code) {
        
        if (error) {
            return callback(error);
        }
        
        if (parseInt(pid, 10)) {
            return callback(null, true);
        }
        
        callback(null, false);
    });
}

exports.readDescriptor = readDescriptor;

exports.install = install;
exports.uninstall = uninstall;

exports.getApplication = getApplication;
exports.getApplications = getApplications;
exports.getApplicationDomains = getApplicationDomains;
exports.isApplicationRunning = isApplicationRunning;
