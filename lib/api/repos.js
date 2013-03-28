var fs = require("fs");
var cp = require("child_process");

/*
 * Clones a git repo to a certain directory. The directory must exist
 */
function cloneToDir(url, dirName, baseName, callback) {

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

function checkoutTag(repoDir, tag, callback) {

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


exports.cloneToDir = cloneToDir;
exports.checkoutTag = checkoutTag;

