var fs = require("fs");

var mod_model = require('./module/model.js');


function install (module, callback) {

    // if the module exists, just get it's id (unless it's a "dev" version)
    if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {

        // if not the "dev" version, skip this module
        if (module.version !== "dev") {

            console.log("Skipping " + module.getVersionPath());
            mod_model.getModuleVersionId(module, function(err, id) {

                if (err) { return callback(err); }

                module._vid = id;

                M.model.getModuleVersionDependencies(module._vid, callback);
            });

            return;
        }
        // if the "dev" version, always reinstall this module
        else {

            // uninstall first for dev modules
            uninstallModule(module, function(err) {

                if (err) { return callback(err); }

                // now perform a clean install
                installModuleActions(module, callback);
            });
            return;
        }
    }

    // do the actual installation
    installModuleActions(module, callback);
}

function installModuleActions (module, local, callback) {

    if (typeof local === "function") {
        callback = local;
        local = false;
    }

    // wrap the callback to perform cleanup on error
    var initialCallback = callback;
    callback = function(err, data) {

        if (!err) {
            return initialCallback(null, data);
        }

        if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
            console.error("Module installation error. Removing module: " + module.getVersionPath());
        }
        remove(module, function(err1) {
            if (err1) {
                return initialCallback("Cannot cleanup module: " + module.getVersionPath() + ". " + JSON.stringify(err1));
            }
            initialCallback(err, data);
        });
    }

    // ***********
    // 1. DOWNLOAD
    // ***********
    if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
        console.log("Fetching module: " + module.getModulePath() + (local ? " (local: " + module.local + ")" : ""));
    }
    fetch(module, local, function(err) {

        if (err) { return callback(err); }

        // ******************
        // 2. READ DESCRIPTOR
        // ******************
        if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
            console.log("Reading module descriptor: " + module.getVersionPath());
        }
        readModuleDescriptor(module, function(err, descriptor) {

            if (err) { return callback(err); }

            // the descriptor is a valid descriptor at this point

            // ***********************
            // 3. INSTALL DEPENDENCIES
            // ***********************
            if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                console.log("Installing dependencies for module: " + module.getVersionPath());
            }

            installDependencies(descriptor, function(err, installedDependencies) {

                // ****************
                // 4. UPSERT MODULE
                // ****************
                if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                    console.log("Upserting module: " + module.getModulePath());
                }
                mod_model.upsert(module, function(err, modDoc) {

                    if (err) { return callback(err); }
                    
                    // ************************
                    // 5. UPSERT MODULE VERSION
                    // ************************
                    if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                        console.log("Upserting module version: " + module.getVersionPath());
                    }
                    mod_model.upsertVersion(module, function(err, versionDoc) {

                        if (err) { return callback(err); }

                        // *************************
                        // 6. READ MODULE OPERATIONS
                        // *************************
                        if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                            console.log("Reading module operations from: " + module.getVersionPath() + "/mono.json");
                        }
                        readModuleOperations(module, function(err, operations) {

                            if (err) { return callback(err); };

                            module.operations = operations;

                            // ***************************
                            // 7. INSERT MODULE OPERATIONS
                            // ***************************
                            if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                                console.log("Inserting " + operations.length + " operations for module: " + module.getVersionPath());
                            }
                            mod_model.insertOperations(module, function(err, inserted) {

                                if (err) { return callback(err); };

                                if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                                    console.log("Inserted " + inserted.length + " operations for module: " + module.getVersionPath());
                                }

                                // ********************
                                // 8. LINK DEPENDENCIES
                                // ********************
                                if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                                    console.log("Adding dependency links: " + module.getVersionPath() + "/mono.json");
                                }
                                addDependencyLinks(module, descriptor, installedDependencies, function(err) {

                                    if (err) { return callback(err); };

                                    callback(null, installedDependencies);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function readModuleOperations(module, callback) {

    fs.readFile(M.config.MODULE_ROOT + module.getVersionPath() + "/mono.json", function (err, data) {

        if (err) { return callback("Error while reading the mono.json file for module " + module.getVersionPath()) };

        // transform from buffer to string
        data = data.toString();

        // an empty file is a valid file
        if (data.trim() === "") {
            return callback(null, []);
        }

        // parse the file and find the operations, if any
        var mono = {};
        try {
            mono = JSON.parse(data);
        } catch (err) {
            console.dir(err);
            callback("Invalid mono.json in module " + module.getVersionPath());
        }

        callback(null, mono.operations || []);
    });
}

function readModuleDescriptor (module, callback) {

    // if the module version does not exists, throw error 
    if (!fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
        return callback("The module does not exist: " + module.getVersionPath());
    }

    var file = M.config.MODULE_ROOT + module.getVersionPath() + "/mono.json";

    M.app.readDescriptor(file, function(err, descriptor) {

        if (err) {
            return callback("Error while reading the module descriptor file: " + file);
        }

        // TODO validate descriptor

        callback(null, descriptor);
    });
}

function installDependencies (descriptor, callback) {

    // just call back is there are no dependencies
    if (!descriptor.dependencies) {
        return callback(null, {});
    }

    var moduleRoot = M.config.MODULE_ROOT;
    var depKeys = Object.keys(descriptor.dependencies);
    var count = depKeys.length;
    var errors = [];
    var dependencies = {};
    var index = 0;

    function installDependenciesSequential(index) {

        if (index >= count) {
            return callback(null, dependencies);
        }

        var key = depKeys[index];
        var splits = key.split("/");
        var module = new exports.Module(splits[0], splits[1], splits[2], descriptor.dependencies[key]);

        install(module, function(err, installedDependencies) {

            if (err) {
                console.error("Could not install dependency: " + module.getVersionPath() + ". Reason:");
                console.error(JSON.stringify(err));
                errors.push(err);
            } else if (module._vid != undefined) {
                //console.log("Installed dependency: " + module.getVersionPath());

                // add this module to the dependency list
                dependencies[module.getVersionPath()] = module._vid;

                // add sub-dependencies to this app dependencies
                for (var key in installedDependencies) {
                    dependencies[key] = installedDependencies[key];
                }
            }

            installDependenciesSequential(++index);
        })
    }

    installDependenciesSequential(index);
}

function addDependencyLinks (module, descriptor, installedDependencies, callback) {

    // just call back is there are no dependencies
    if (!descriptor.dependencies) {
        return callback(null);
    }

    var depKeys = Object.keys(descriptor.dependencies);
    var count = depKeys.length;
    var index = 0;

    function addDependencyLinksSequential(index) {

        if (index >= count) {
            return callback(null);
        }

        var key = depKeys[index] + "/" + descriptor.dependencies[depKeys[index]];
        var depId = installedDependencies[key];

        mod_model.addVersionDependency(module._vid, depId, function(err) {

            if (err) {
                console.error("Could not add dependency link from version '" + module.getVersionPath() + "' to module version '" + key + "'");
            }

            addDependencyLinksSequential(++index);
        })
    }

    addDependencyLinksSequential(index);
}

function remove (module, callback) {
    var dirName = M.config.MODULE_ROOT + module.getVersionPath();
    M.fs.removeDirectory(dirName, callback);
}

function fetch (module, local, callback) {

    if (typeof local === "function") {
        callback = local;
        local = false;
    }

    addDirectory(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }

        // if this commit version is already present give up
        if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
            return callback(null);
        }

        // if local installation, copy the module
        if (local) {
            M.fs.copyDirectory(module.local, M.config.MODULE_ROOT + module.getVersionPath(), { createParents: false },  callback);
        }
        // else clone from the web
        else {
            cloneVersion(module, callback);
        }
    });
}

function addDirectory(source, owner, module, callback) {

    var dirName = M.config.MODULE_ROOT + source + "/" + owner + "/" + module;
    M.fs.makeDirectory(dirName, callback);
}

function cloneVersion (module, callback) {

    var url = module.getSourceUrl();
    if (!url) {
        return callback({ error: "Invalid source: " + module.source, code: 204 });
    }

    var dirName = M.config.MODULE_ROOT + module.getModulePath();
    var version = module.version;

    // clone the repo now from url, in the target directory, in a directory having the version name
    M.repos.cloneToDir(url, dirName, version, function(err) {

        if (err) { return callback(err) };

        // reset to this version
        M.repos.checkoutTag(dirName + "/" + version, version, callback);
    });
}

/*******************************************************/
/*********************** exports ***********************/
/*******************************************************/

exports.Module = function(source, owner, name, version) {

    source = source || "";
    owner = owner || "";
    name = name || "";
    version = version || "latest"

    function getModulePath() {
        return source + "/" + owner + "/" + name;
    }
    
    function getVersionPath() {
        return getModulePath() + "/" + version;
    }
    
    function getSourceUrl() {
        
        // over HTTPS
        switch (source) {
            case "github":
                return "https://github.com/" + owner + "/" + name + ".git";
            case "bitbucket":
                var credentials = "";

                if (name.indexOf("liqshop") == 0) {
                    credentials += "gabipetrovay:mEmphis0@";
                } else if (owner === "jillix") {
                    credentials += "gabipetrovay:mEmphis0@"
                }

                return "https://" + credentials + "bitbucket.org/" + owner + "/" + name.toLowerCase() + ".git";
            default:
                return null;
        }
        
        // over SSH
        /*switch (source) {
            case "github":
                return "git@github.com:" + owner + "/" + name + ".git";
            case "bitbucket":
                return "git@bitbucket.org:" + owner + "/" + name + ".git";
            default:
                return null;
        }*/
    }

    return {
        source: source,
        owner: owner,
        name: name,
        version: version,

        getModulePath: getModulePath,
        getVersionPath: getVersionPath,
        getSourceUrl: getSourceUrl
    }
};

exports.install = install;
exports.remove = remove;
exports.fetch = fetch;

exports.getConfig = mod_model.getConfig;
exports.getFile = mod_model.getFile;

