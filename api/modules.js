var fs = require("fs");
var cp = require("child_process");

var db = require(CONFIG.root + "/core/model/orient.js");

var MODULE_ROOT = CONFIG.root + "/modules/";


function gitClone(url, dirName, baseName, callback) {

    fs.exists(dirName + "/" + baseName, function(exists) {

        if (exists) {
            return callback({ error: "Path already exists: " + dirName + "/" + baseName, code: 201 });
        }

        var options = {
            cwd: dirName
        };
        var git = cp.spawn("git", ["clone", url, baseName], options);

        if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
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

    var options = {
        cwd: MODULE_ROOT
    };
    var mkdir = cp.spawn("mkdir", ["-p", source + "/" + owner + "/" + module], options);

    mkdir.on("exit", function(code) {

        if (code) {
            return callback({ error: "Failed to create module directory: " + source + "/" + owner + "/" + module, code: 203 });
        }
        callback(null);
    });
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

    var dirName = MODULE_ROOT + module.getModulePath();
    var version = module.version;

    // clone the repo now from url, in the target directory, in a directory having the version name
    gitClone(url, dirName, version, function(err) {

        if (err) { return callback(err) };

        // reset to this version
        gitCheckoutTag(dirName + "/" + version, version, callback);
    });
}

// ************** API **************

function fetchModule(module, callback) {

    addModuleDir(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }

        // if this commit version is already present give up
        if (fs.existsSync(MODULE_ROOT + module.getVersionPath())) {
            return;
        }

        cloneModuleVersion(module, callback);
    });
}

function removeModule(module, callback) {

    var options = {
        cwd: MODULE_ROOT
    };
    var git = cp.spawn("rm", ["-Rf", module.getVersionPath()], options);

    git.on("exit", function(code) {
        if (code) {
            return callback("Could not remove module: " + module.getVersionPath());
        }
        callback(null);
    });
}

function getModuleOperations(module, callback) {

    fs.readFile(MODULE_ROOT + module.getVersionPath() + "/mono.json", function (err, data) {

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
    if (!fs.existsSync(MODULE_ROOT + module.getVersionPath())) {
        return callback("The module does not exist: " + module.getVersionPath());
    }

    var file = MODULE_ROOT + module.getVersionPath() + "/mono.json";

    fs.readFile(file, function (err, data) {

        if (err) {
            return callback("Error while reading the module descriptor file: " + file);
        }

        var descriptor = null;

        try {
            descriptor = JSON.parse(data);
        } catch (err) {
            var error = "Invalid descriptor file (" + file + "): " + data.toString();
            return callback(error);
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

    var moduleRoot = CONFIG.root + "/modules/";
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

        db.addModuleVersionDependency(module._vid, depId, function(err) {

            if (err) {
                console.error("Could not add dependency link from version '" + module.getVersionPath() + "' to module version '" + key + "'");
            }

            addDependencyLinksSequential(++index);
        })
    }

    addDependencyLinksSequential(index);
}

function installModule(module, callback) {

    // if the module exists, just get it's id (unless it's a "dev" version)
    if (fs.existsSync(MODULE_ROOT + module.getVersionPath())) {
        // id not a dev module
        if (module.version !== "dev") {
            console.log("Skipping " + module.getVersionPath());
            db.getModuleVersionId(module, function(err, id) {

                if (err) { return callback(err); }

                module._vid = id;

                db.getModuleVersionDependencies(module._vid, callback);
            });
            return;
        } else {
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

function installModuleActions(module, callback) {

    // wrap the callback to perform cleanup on error
    var initialCallback = callback;
    callback = function(err, data) {

        if (!err) {
            return initialCallback(null, data);
        }

        if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
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
    if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
        console.log("Fetching  module: " + module.getModulePath());
    }
    fetchModule(module, function(err) {

        if (err) { return callback(err); }

        // ******************
        // 2. READ DESCRIPTOR
        // ******************
        if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
            console.log("Reading module descriptor: " + module.getVersionPath());
        }
        readModuleDescriptor(module, function(err, descriptor) {

            if (err) { return callback(err); }

            // the descriptor is a valid descriptor at this point

            // ***********************
            // 3. INSTALL DEPENDENCIES
            // ***********************
            if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                console.log("Installing dependencies for module: " + module.getVersionPath());
            }
            installDependencies(descriptor, function(err, installedDependencies) {

                // ****************
                // 4. UPSERT MODULE
                // ****************
                if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                    console.log("Upserting module: " + module.getModulePath());
                }
                db.upsertModule(module, function(err, modDoc) {

                    if (err) { return callback(err); }
                    
                    // ************************
                    // 5. UPSERT MODULE VERSION
                    // ************************
                    if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                        console.log("Upserting module version: " + module.getVersionPath());
                    }
                    db.upsertModuleVersion(module, function(err, versionDoc) {

                        if (err) { return callback(err); }

                        // *************************
                        // 6. READ MODULE OPERATIONS
                        // *************************
                        if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                            console.log("Reading module operations from: " + module.getVersionPath() + "/mono.json");
                        }
                        getModuleOperations(module, function(err, operations) {

                            if (err) { return callback(err); };

                            module.operations = operations;

                            // ***************************
                            // 7. INSERT MODULE OPERATIONS
                            // ***************************
                            if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                                console.log("Inserting " + operations.length + " operations for module: " + module.getVersionPath());
                            }
                            db.insertOperations(module, function(err, inserted) {

                                if (err) { return callback(err); };

                                if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
                                    console.log("Inserted " + inserted.length + " operations for module: " + module.getVersionPath());
                                }

                                // ********************
                                // 8. LINK DEPENDENCIES
                                // ********************
                                if (CONFIG.log.moduleInstallation || CONFIG.logLevel === "verbose") {
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

    db.deleteModuleVersion(module, function(err) {
        if (err) {
            return callback(err);
        }

        removeModule(module, callback);
    });
}

function setLatestVersion(module, callback) {

    var options = {
        cwd: MODULE_ROOT + module.getModulePath()
    };
    var ln = cp.spawn("ln", ["-shf", module.latest, "latest"], options);

    ln.on("exit", function(code) {
        if (code) {
            return callback({ error: "ln error: ln exited with code " + code, code: 210 });
        }
        callback(null);
    });
}


exports.fetchModule = fetchModule;
exports.removeModule = removeModule;
exports.installModule = installModule;
exports.uninstallModule = uninstallModule;
exports.setLatestVersion = setLatestVersion;

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
        switch (source) {
            case "github":
                return "https://github.com/" + owner + "/" + name + ".git";
            case "bitbucket":
                var credentials = "";

                if (name.indexOf("liqshop") == 0) {
                    credentials += "gabipetrovay:mEmphis@";
                } else if (owner === "faeb187") {
                    credentials += "faeb187:MGi232588@"
                }

                return "https://" + credentials + "bitbucket.org/" + owner + "/" + name.toLowerCase() + ".git";
            default:
                return null;
        }
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

