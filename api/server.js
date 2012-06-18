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
            cwd: repoDir + "/" + commit
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

// ************** API **************

function fetchModule(user, module, version, callback) {

    var dirName = CONFIG.root + "/modules/" + user + "/" + module;
    var url = "https://github.com/" + user + "/" + module + ".git";

    // clone the repo first
    gitClone(url, dirName, version, function(err) {

        if (err) { return callback(err) };

        // reset to this version (commit)
        gitReset(dirName, version, callback);
    });
}

function removeModule(user, module, version, callback) {

    var options = {
        cwd: CONFIG.root + "/modules/" + user + "/" + module + "/"
    };
    var git = cp.spawn("rm", ["-Rf", version], options);

    git.on("exit", function(code) {
        if (code) {
            return callback("Could not remove module: " + user + "/" + module + "/" + version);
        }
        callback(null);
    });
}

function installModule(user, module, version, callback) {

    fetchModule(user, module, version, function(err) {

        if (err) {
            return callback(err);
        }

        db.insertModule(user, module, version, callback);
    });
}

function uninstallModule(user, module, version, callback) {

    removeModule(user, module, version, function(err) {

        if (err) {
            return callback(err);
        }

        db.deleteModule(user, module, version, callback);
    });
}


exports.fetchModule = fetchModule;
exports.removeModule = removeModule;
exports.installModule = installModule;
exports.uninstallModule = uninstallModule;

