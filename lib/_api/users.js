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

function addUser(user, callback) {

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


function installModule(module, callback) {

    if (fs.existsSync(MODULE_ROOT + module.getVersionPath())) {
        console.log("Skipping " + module.getVersionPath());
        return callback(null, false);
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

            M.model.insertModuleVersion(module, function(err) {
                if (err) {return callback(err); }
                callback(null, true);
            });
        });
    });
}


exports.addUser = addUser;
//exports.removeUser = removeUser;

exports.User = function(username, password, data) {

    username = username || "";
    password = password || "";
    data = data || {};

    return {
        username: username,
        password: password,
        data: data
    }
};
