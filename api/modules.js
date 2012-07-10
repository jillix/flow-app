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

        git.on("exit", function(code) {
            if (code) {
                return callback({ error: "Git error: git clone exited with code " + code, code: 200 });
            }
            callback(null);
        });
    });
}

function gitReset(repoDir, commit, callback) {

    fs.exists(repoDir + "/.git", function(exists) {

        if (!exists) {
            return callback({ error: "Path is not a git repository: " + repoDir, code: 202 });
        }

        var options = {
            cwd: repoDir
        };
        var revert = cp.spawn("git", ["reset", "--hard", commit], options);

        revert.on("exit", function(code) {
            if (code) {
                return callback({ error: "Git error: git reset exited with code " + code, code: 200 });
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


function findLatestCommit(module, callback) {

    var git = cp.spawn("git", ["ls-remote", module.getGitUrl(), "HEAD"]);

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

    var url = module.getGitUrl();
    if (!url) {
        return callback({ error: "Invalid source: " + module.source, code: 204 });
    }

    var version = module.version === "latest" ? module.latest : module.version;

    if (!version || version === "latest") {
        return callback({ error: "Invalid module latest version resolution: " + module.getVersionPath(), code: 209 });
    }

    var dirName = MODULE_ROOT + module.getModulePath();

    // clone the repo now from url, in the target directory, in a directory having the version name
    gitClone(url, dirName, version, function(err) {

        if (err) { return callback(err) };

        if (module.version === "latest") {
            // make this version the latest one
            setLatestVersion(module, callback);
        } else {
            // reset to this version
            gitReset(dirName + "/" + version, version, callback);
        }
    });
}

// ************** API **************

function fetchModule(module, callback) {

    addModuleDir(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }

        if (module.version !== "latest") {
            // for fixed version modules, just clone
            cloneModuleVersion(module, callback);
            return;
        } else {
            // for sliding version modules, get the latest
            findLatestCommit(module, function(err, commit) {

                if (err) { return callback(err); }

                module.latest = commit;

                // if this commit version is already present, just make sure we have the latest symlink
                if (fs.existsSync(MODULE_ROOT + module.getModulePath() + "/" + commit)) {
                    setLatestVersion(module, callback);
                    return;
                }

                cloneModuleVersion(module, callback);
            });
        }
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

function installModule(module, callback) {

    if (fs.existsSync(MODULE_ROOT + module.getVersionPath())) {
        console.log("Skipping " + module.getVersionPath());
        return callback();
    }

    fetchModule(module, function(err) {

        if (err) {
            return callback(err);
        }

        getModuleOperations(module, function(err, operations) {

            if (err) {
                removeModule(module, function(err1) {
                    callback(err);
                });
                return
            };

            module.operations = operations;

            db.insertModuleVersion(module, callback);
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
    
    function getGitUrl() {
        switch (source) {
            case "github":
                return "https://github.com/" + owner + "/" + name + ".git";
            case "bitbucket":
                return "git@bitbucket.org:" + owner + "/" + name.toLowerCase() + ".git";
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
        getGitUrl: getGitUrl
    }
};

