var fs = require("fs");
var cp = require("child_process");

/*
    Clones a git repo to a certain directory. The directory must exist
*/
function gitClone(url, dirName, baseName, callback) {

    fs.exists(dirName + "/" + baseName, function(exists) {

        if (exists) {
            return callback({ error: "Path already exists: " + dirName + "/" + baseName, code: 201 });
        }

        var options = {
            cwd: dirName
        };
        var git = cp.spawn("git", ["clone", url, baseName], options);

        if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
            git.stdout.on("data", function(data) {
                console.log(data.toString());
            });
            git.stderr.on("data", function(data) {
                console.error(data.toString());
            });
        }

        git.on("exit", function(code) {
            if (code) {
                return callback({ error: "Git error: git clone exited with code " + code, code: 200 });
            }
            callback(null);
        });
    });
}

function gitCheckoutTag(repoDir, tag, callback) {

    fs.exists(repoDir + "/.git", function(exists) {

        if (!exists) {
            return callback({ error: "Path is not a git repository: " + repoDir, code: 202 });
        }

        var options = {
            cwd: repoDir
        };
        var git = cp.spawn("git", ["checkout", "tags/" + tag], options);

        git.on("exit", function(code) {
            if (code) {
                return callback({ error: "Git error: git checkout (tag) exited with code " + code, code: 208 });
            }
            callback(null);
        });
    });
}

function addModuleDir(source, owner, module, callback) {

    var dirName = M.config.MODULE_ROOT + source + "/" + owner + "/" + module;
    M.dir.makeDirectory(dirName, callback);
}


function findLatestTag(module, callback) {

    var git = cp.spawn("git", ["git", "describe", "--abbrev=0", "--tags"]);
    var out = "";

    git.stdout.on("data", function(data) {
        out += data.toString();
    });

    git.stderr.on("data", function() {});

    git.on("exit", function(code) {

        if (code || !out || out.length < 40) {
            return callback({ error: "Failed to retrieve module latest commit ID for module: " + module.getModulePath(), code: 207 });
        }
        callback(null, out.substr(0, 40));
    });

}

function cloneModuleVersion(module, callback) {

    var url = module.getSourceUrl();
    if (!url) {
        return callback({ error: "Invalid source: " + module.source, code: 204 });
    }

    var dirName = M.config.MODULE_ROOT + module.getModulePath();
    var version = module.version;

    // clone the repo now from url, in the target directory, in a directory having the version name
    gitClone(url, dirName, version, function(err) {

        if (err) { return callback(err) };

        // reset to this version
        gitCheckoutTag(dirName + "/" + version, version, callback);
    });
}

// ************** API **************

function fetchModule(module, local, callback) {

    if (typeof local === "function") {
        callback = local;
        local = false;
    }

    addModuleDir(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }

        // if this commit version is already present give up
        if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
            return;
        }

        // if local installation, copy the module
        if (local) {
            M.dir.copyDirectory(module.local, M.config.MODULE_ROOT + module.getVersionPath(), { createParents: false },  callback);
        }
        // else clone from the web
        else {
            cloneModuleVersion(module, callback);
        }
    });
}

function removeModule(module, callback) {
    var dirName = M.config.MODULE_ROOT + module.getVersionPath();
    M.dir.removeDirectory(dirName, callback);
}

function getModuleOperations(module, callback) {

    fs.readFile(M.config.MODULE_ROOT + module.getVersionPath() + "/mono.json", function (err, data) {

        if (err) { return callback("Error while reading the mono.json file for module " + module.getVersionPath()) };

        // transform from buffer to string
        data = data.toString();

        // an empty file is a valid file
        if (data.trim() === "") {
            return callback(null, []);
        }

        // parse the file and find the operations, if any
        try {
            var mono = JSON.parse(data);
            callback(null, mono.operations || []);
        } catch (err) {
            console.dir(err);
            callback("Invalid mono.json in module " + module.getVersionPath());
        }
    });
}

function readModuleDescriptor(module, callback) {

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

function installDependencies(descriptor, callback) {

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

        installModule(module, function(err, installedDependencies) {

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

function addDependencyLinks(module, descriptor, installedDependencies, callback) {

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

        M.model.addModuleVersionDependency(module._vid, depId, function(err) {

            if (err) {
                console.error("Could not add dependency link from version '" + module.getVersionPath() + "' to module version '" + key + "'");
            }

            addDependencyLinksSequential(++index);
        })
    }

    addDependencyLinksSequential(index);
}

function installLocalModule(module, callback) {

    // local module must have a local flag pointing to the module directory
    if (!module.local || !fs.existsSync(module.local)) {
        return callback("The local module does not exist: " + module.getVersionPath());
    }

    // the module must not be already installed
    M.model.getModuleVersion(module, function(err, version) {

        if (err) { return callback(err); }

        // if this version already exists in the database throw error
        if (version) { return callback("This module version is already installed: " + module.getVersionPath()); }

        // now we can install this module locally
        installModuleActions(module, true, callback);
    });
}

function installModule(module, callback) {

    // if the module exists, just get it's id (unless it's a "dev" version)
    if (fs.existsSync(M.config.MODULE_ROOT + module.getVersionPath())) {
        // if not the "dev" version, skip this module
        if (module.version !== "dev") {
            console.log("Skipping " + module.getVersionPath());
            M.model.getModuleVersionId(module, function(err, id) {

                if (err) { return callback(err); }

                module._vid = id;

                M.model.getModuleVersionDependencies(module._vid, callback);
            });
            return;
        }
        // ifthe "dev" version, always reinstall this module
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

function installModuleActions(module, local, callback) {

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
        removeModule(module, function(err1) {
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

    fetchModule(module, local, function(err) {

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
                M.model.upsertModule(module, function(err, modDoc) {

                    if (err) { return callback(err); }
                    
                    // ************************
                    // 5. UPSERT MODULE VERSION
                    // ************************
                    if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                        console.log("Upserting module version: " + module.getVersionPath());
                    }
                    M.model.upsertModuleVersion(module, function(err, versionDoc) {

                        if (err) { return callback(err); }

                        // *************************
                        // 6. READ MODULE OPERATIONS
                        // *************************
                        if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                            console.log("Reading module operations from: " + module.getVersionPath() + "/mono.json");
                        }
                        getModuleOperations(module, function(err, operations) {

                            if (err) { return callback(err); };

                            module.operations = operations;

                            // ***************************
                            // 7. INSERT MODULE OPERATIONS
                            // ***************************
                            if (M.config.log.moduleInstallation || M.config.logLevel === "verbose") {
                                console.log("Inserting " + operations.length + " operations for module: " + module.getVersionPath());
                            }
                            M.model.insertOperations(module, function(err, inserted) {

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

function uninstallModule(module, callback) {

    M.model.deleteModuleVersion(module, function(err) {
        if (err) {
            return callback(err);
        }

        removeModule(module, callback);
    });
}


exports.fetchModule = fetchModule;
exports.removeModule = removeModule;
exports.installModule = installModule;
exports.uninstallModule = uninstallModule;

exports.installLocalModule = installLocalModule;

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
