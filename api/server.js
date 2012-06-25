var fs = require("fs"),
    path = require('path'),
    cp = require('child_process');

var db = require(CONFIG.root + "/core/model/orient.js");


/*
    Clones a git repo to a certain directory. The directory must exist
*/
function gitClone(url, dirName, baseName, callback) {

    path.exists(dirName + "/" + baseName, function(exists) {

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

    path.exists(repoDir + "/.git", function(exists) {

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
        cwd: CONFIG.root + "/modules"
    };
    var mkdir = cp.spawn("mkdir", ["-p", source + "/" + owner + "/" + module], options);

    mkdir.on("exit", function(code) {

        if (code) {
            return callback({ error: "Failed to create module directory: " + source + "/" + owner + "/" + module, code: 203 });
        }
        callback(null);
    });
}


// ************** API **************

function fetchModule(source, owner, module, version, callback) {

    addModuleDir(source, owner, module, function(err) {

        if (err) { return callback(err); }
    
        var dirName = CONFIG.root + "/modules/" + source + "/" + owner + "/" + module;
        var url = null;
        switch (source) {
            case "github":
                url = "https://github.com/" + owner + "/" + module + ".git";
                break;
            case "bitbucket":
                url = "git@bitbucket.org:" + owner + "/" + module.toLowerCase() + ".git";
                break;
            default:
                callback({ error: "Invalid source: " + source, code: 204});
                return;
        }

        // clone the repo first
        gitClone(url, dirName, version, function(err) {

            if (err) { return callback(err) };

            // reset to this version (commit)
            gitReset(dirName + "/" + version, version, callback);
        });
    });
}

function removeModule(source, owner, module, version, callback) {

    var options = {
        cwd: CONFIG.root + "/modules/" + source + "/" + owner + "/" + module + "/"
    };
    var git = cp.spawn("rm", ["-Rf", version], options);

    git.on("exit", function(code) {
        if (code) {
            return callback("Could not remove module: " + source + "/" + owner + "/" + module + "/" + version);
        }
        callback(null);
    });
}

function installModule(source, owner, module, version, callback) {

    fetchModule(source, owner, module, version, function(err) {

        if (err) {
            return callback(err);
        }

        db.insertModuleVersion(source, owner, module, version, callback);
    });
}

function uninstallModule(source, owner, module, version, callback) {

    removeModule(source, owner, module, version, function(err) {

        if (err) {
            return callback(err);
        }

        db.deleteModuleVersion(source, owner, module, version, callback);
    });
}


exports.fetchModule = fetchModule;
exports.removeModule = removeModule;
exports.installModule = installModule;
exports.uninstallModule = uninstallModule;

