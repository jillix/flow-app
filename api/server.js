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

function removeModule(module, callback) {

    var options = {
        cwd: CONFIG.root + "/modules/"
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

    fs.readFile(CONFIG.root + "/modules/" + module.getVersionPath() + "/mono.json", function (err, data) {

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
            callback("Invalid mono.json in module " + module.getVersionPath());
        }
    });
}

function installModule(module, callback) {

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
        cwd: CONFIG.root + "/modules/"
    };
    var ln = cp.spawn("ln", ["-shf", module.version, module.getModulePath() + "/latest"], options);

    // TODO the order is important: create latest link and 
    ln.on("exit", function(code) {
        if (code) {
            return callback({ error: "ln error: ln exited with code " + code, code: 210 });
        }
        callback(null);
    });
}

// = = = = = = = = = = = = = = = = = = = = 

//
// TODO is there a way to reserve IDs in Orient to poulate bulk import scripts?
//

/*
    Takes an application descriptor and deploys an application.
    If description.application.appId exists already, redeploy the app.
    If description.application.appId does not exists, deploy a new app.

    {
        application: {
            _id: ?
            appId:
        }
    }
*/
function deployApplication(descriptor, callback) {

}

/*
    Removes a deployed application havin the given appId.
*/
function undeployApplication(appId, callback) {

}

/*
    {
        users: [
            {
                _did: 1001
                _id: ?
                ...
            }
        ],
    }
*/
function createUsers(descriptor, callback) {

}

// = = = = = = = = = = = = = = = = = = = = 


exports.deployApplication = deployApplication;
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
    
    return {
        source: source,
        owner: owner,
        name: name,
        version: version,

        getModulePath: getModulePath,
        getVersionPath: getVersionPath
    }
};

