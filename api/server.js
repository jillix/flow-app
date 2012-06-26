var fs = require("fs"),
    cp = require('child_process');

var db = require(CONFIG.root + "/core/model/orient.js");


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

function fetchModule(module, callback) {

    addModuleDir(module.source, module.owner, module.name, function(err) {

        if (err) { return callback(err); }
    
        var dirName = CONFIG.root + "/modules/" + module.source + "/" + module.owner + "/" + module.name;
        var url = null;
        switch (module.source) {
            case "github":
                url = "https://github.com/" + module.owner + "/" + module.name + ".git";
                break;
            case "bitbucket":
                url = "git@bitbucket.org:" + module.owner + "/" + module.name.toLowerCase() + ".git";
                break;
            default:
                callback({ error: "Invalid source: " + module.source, code: 204});
                return;
        }

        // clone the repo first
        gitClone(url, dirName, module.version, function(err) {

            if (err) { return callback(err) };

            // reset to this version (commit)
            gitReset(dirName + "/" + module.version, module.version, callback);
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

function getModuleOperations(module, callback) {

    fs.readFile(CONFIG.root + "/modules/" + module.relativePath() + "/mono.json", function (err, data) {

        if (err) { return callback("Error while reading the mono.json file for module " + module.relativePath()) };

        var mono = {};

        try {
            mono = JSON.parse(data);
            operations = mono.operations;
        } catch (err) {
            callback("Invalid mono.json in module " + module.relativePath());
        }

        callback(null, mono.operations || []);
    });
}


function installModule(source, owner, name, version, callback) {

    var module = {
        source: source,
        owner: owner,
        name: name,
        version: version,
        relativePath: function() { return source + "/" + owner + "/" + name + "/" + version; }
    };

    fetchModule(module, function(err) {

        if (err) {
            return callback(err);
        }

        getModuleOperations(module, function(err, operations) {

            if (err) { return callback(err) };

            module.operations = operations;

            db.insertModuleVersion(module, callback);
        });
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

