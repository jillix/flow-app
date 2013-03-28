var fs = require("fs");
var cp = require("child_process");

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

// ************** API **************

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

function uninstallModule(module, callback) {

    M.model.deleteModuleVersion(module, function(err) {
        if (err) {
            return callback(err);
        }

        removeModule(module, callback);
    });
}


exports.uninstallModule = uninstallModule;

exports.installLocalModule = installLocalModule;

