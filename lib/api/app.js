var fs = require('fs');

var app_model = require('./app/model');
var mod_model = require('./module/model');
var ops_model = require('./operation/model');


function getFromHost (host, fields, callback) {
    app_model.getFromHost(host, fields, callback);
}

function getApplications (callback) {
    app_model.getApplications(callback);
}

function getDomains (appId, callback) {
    app_model.getDomains(appId, callback);
}

function fetch (url, callback) {

    // verify that we can access the repo and that it is a valid app repo and get the app ID
    M.repo.getJsonFromRepo(url, 'mono.json', function(err, descriptor) {

        if (err) { return callback(err); }

        // clone the app to the application directory
        M.repo.cloneToDir(url, M.config.APPLICATION_ROOT, descriptor.appId, function(err) {

            if (err) { return callback(err); }

            callback(null, descriptor);
        });
    })
}

/**
 * Installs an application given an application descriptor.
 *
 * descriptor: a path to the application descriptor file
 *             or a descriptor object
 * callback: an optional function called when install completes
 */
function install (descriptor, callback) {

    if (!callback) {
        callback = function() {};
    }

    switch (typeof descriptor) {
        case 'string':
            installFromFile(descriptor, callback);
            break;
        case 'object':
            installFromObject(descriptor, callback);
            break;
        default:
            callback(M.error(M.error.API_APP_INVALID_DESCRIPTOR_ARGUMENT));
    }
};

/**
 * Unistalls an application given an application descriptor.
 *
 * descriptor: a path to the application descriptor file
 *             or a descriptor object
 * callback: an optional function called when uninstall completes
 */
function uninstall (descriptor, callback) {

    if (!callback) {
        callback = function() {};
    }

    switch (typeof descriptor) {
        case "string":
            uninstallFromFile(descriptor, callback);
            break;
        case "object":
            uninstallFromObject(descriptor, callback);
            break;
        default:
            callback(M.error(M.error.API_APP_INVALID_DESCRIPTOR_ARGUMENT));
    }
};

/**
 *
 */
function installFromFile (file, callback) {

    readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        installFromObject(descriptor, callback);
    });
}

/**
 *
 */
function uninstallFromFile (file, callback) {

    readDescriptor(file, function(err, descriptor) {

        if (err) { return callback(err); }

        uninstallFromObject(descriptor, callback);
    });
}

/**
 *
 */
function installFromObject (descriptor, callback) {

    // TODO validate the descriptor
    M.orient.connect(function(err) {

        if (err) {
            return callback(err, descriptor);
        }

        // **************
        // 1. APPLICATION
        // **************
        if (M.config.log.applicationInstallation || M.config.logLevel === 'verbose') {
            console.log('Adding new application: ' + descriptor.appId);
        }
        app_model.addApplication(
                descriptor.appId,
                descriptor.name || 'Unnamed application',
                descriptor.routes || null,
                descriptor.errors || null,
                descriptor.scripts || [],
                descriptor.publicDir || '',
                descriptor.locale || '*',
                function(err, _id) {

            // TODO cleanup
            var error = M.error()
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
                installRoles(descriptor, function(err, publicRole) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // ******************
                    // 4. APP PUBLIC ROLE
                    // ******************
                    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                        console.log("Configuring the public role for application: " + descriptor.appId);
                    }
                    app_model.updatePublicRole(descriptor.appId, publicRole._id, function(err) {

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
}

/**
 *
 */
function uninstallFromObject (descriptor, callback) {

    // TODO validate the descriptor
    M.orient.connect(function(err) {

        if (err) {
            return callback(err, descriptor);
        }

        // ******************
        // 1. GET APPLICATION
        // ******************
        if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
            console.log("Finding application: " + descriptor.appId);
        }
        app_model.getApplication(descriptor.appId, function(err, application) {

            // TODO cleanup
            if (err) { return callback(err, descriptor); }

            var aid = application.aid;

            // ***************
            // 2. DELETE ROLES
            // ***************
            if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                console.log("Deleting roles for application: " + descriptor.appId);
            }
            app_model.deleteRoles(aid, function(err) {

                // TODO cleanup
                if (err) { return callback(err, descriptor); }

                // *****************
                // 3. DELETE DOMAINS
                // *****************
                if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                    console.log("Deleting domains for application: " + descriptor.appId);
                }
                app_model.deleteDomains(descriptor.appId, function(err) {

                    // TODO cleanup
                    if (err) { return callback(err, descriptor); }

                    // *********************
                    // 5. DELETE APPLICATION
                    // *********************
                    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                        console.log("Deleting application: " + descriptor.appId);
                    }
                    app_model.deleteApplication(descriptor.appId, function(err) {

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
 * Adds the domains for the application in the descriptor.
 * TODO This should also add the DNS entries.
 */
function installDomains (descriptor, callback) {

    if (!descriptor.domains || !descriptor.domains.length) {
        return callback(null);
    }

    app_model.addDomains(descriptor._id, descriptor.domains, callback);
}

/**
 *
 */
function installRoles (descriptor, callback) {

    var roles = descriptor.roles;
    var count = roles.length;
    var errors = [];
    var publicRole;

    for (var i in roles) {
        (function(i) {
            var role = roles[i];

            app_model.addRole(descriptor.appId, role.name, function(err, _id) {

                if (err) {
                    errors.push(err);
                } else {
                    role._id = _id;
                }

                // remember if this is the public role
                // publicRole is a string, role.id is an int, therefore ==
                if (descriptor.publicRole == role.id) {
                    publicRole = role;
                }

                if (!--count) callback(errors.length ? errors : null, publicRole);
            });
        })(i);
    }
}

/**
 *
 */
function roleModuleUsage (descriptor, callback) {

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
function addModuleInstanceUses (descriptor, miid, miidObj, callback) {

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

        mod_model.addInstance(miid, descriptor.roles[roles[roleIndex]]._id, descriptor.dependencies[module], miidObj.config, function(err, id) {

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
function roleOperations (descriptor, callback) {

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

        ops_model.addCanPerform(module, miid, canPerform.role, canPerform.name, canPerform.params, function(err, id) {

            if (err) {
                errors.push(err);
            }

            addModuleInstanceOperationsSequential(++index);
        });
    }

    addModuleInstanceOperationsSequential(0);
}

/**
 *
 */
function cleanupApplicationDependencies(descriptor, callback) {

    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
        console.log("Removing dependencies for application: " + descriptor.appId);
    }

    //M.dir.removeDirectory(M.config.APPLICATION_ROOT + descriptor.appId + "/mono_modules", function(err) {

    //    if (err) { return callback(err); }

    //    M.dir.removeDirectory(M.config.APPLICATION_ROOT + descriptor.appId + "/node_modules", callback);
    //});

    M.fs.removeDirectory(M.config.APPLICATION_ROOT + descriptor.appId + "/mono_modules", callback);
}

/**
 *
 */
function installDependencies(descriptor, callback) {

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

            M.module.install(module, function(err, installedDependencies) {

                if (err) {
                    console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                    console.error(JSON.stringify(err));
                    errors.push(err);
                } else if (module._vid != undefined) {
                    if (M.config.log.applicationInstallation || M.config.logLevel === "verbose") {
                        console.log("Installed dependency for application: " + descriptor.appId + ' (' + module.getVersionPath() + ')');
                    }

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
function copyApplicationDependencies (descriptor, dependencies, callback) {

    var moduleRoot = M.config.MODULE_ROOT;
    var appModuleRoot = M.config.APPLICATION_ROOT + descriptor.appId + "/mono_modules/";
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
        var module = new M.module.Module(splits[0], splits[1], splits[2], splits[3]);
        var modulePath = moduleRoot + module.getVersionPath();

        if (fs.existsSync(appModuleRoot + depKeys[index])) {
            copyApplicationDependenciesSequential(++index);
            return;
        }

        M.fs.copyDirectory(modulePath, appModuleRoot + module.getModulePath(), { createParents: true }, function(err) {

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
function readDescriptor(path, callback) {

    fs.readFile(path, function (err, data) {

        if (err) {
            return callback(M.error(M.error.IO_ERROR, 'Error while reading the descriptor file: ' + path));
        }

        var descriptor = null;

        try {
            descriptor = JSON.parse(data);
        } catch (err) {
            return callback(M.error(M.error.API_APP_INVALID_DESCRIPTOR, path));
        }

        callback(null, descriptor);
    });
}

exports.getFromHost = getFromHost;
exports.getApplications = getApplications;
exports.getDomains = getDomains;

exports.install = install;
exports.uninstall = uninstall;
exports.readDescriptor = readDescriptor;

exports.fetch = fetch;

