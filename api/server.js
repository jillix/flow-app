var fs = require("fs");
var cp = require('child_process');


function _copyDirectory(source, destination, callback) {
    var copy = cp.spawn("cp", ["-R", source, destination]);

    copy.on("exit", function(code) {
        if (code) {
            return callback({ error: "copyDirectory error: cp -R exited with code " + code + " for source '" + source + "' and destination '" + destination + "'", code: 101 });
        }
        callback(null);
    });
}

function copyDirectory(source, destination, options, callback) {

    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (options.createParents && !fs.existsSync(destination)) {

        // TODO this is not quite correct:
        // if destination was on purpose a missing directory
        // such that a renaming also takes place, we create
        // the destination directory and copy the source INSIDE
        // of this. As a workaround we created the createParents option
        makeDirectory(destination, function(err) {

            if (err) { return callback(err); }
            _copyDirectory(source, destination, callback);
        });

        return;
    }

    _copyDirectory(source, destination, callback);
}

function makeDirectory(directory, callback) {

    var mkdir = cp.spawn("mkdir", ["-p", directory]);

    mkdir.on("exit", function(code) {

        if (code) {
            return callback({ error: "makeDirectory error: mkdir -p exited with code " + code + " for directory '" + directory + "'", code: 102 });
        }
        callback(null);
    });
}

function removeDirectory(directory, callback) {

    var rm = cp.spawn("rm", ["-Rf", directory]);

    rm.on("exit", function(code) {

        if (code) {
            return callback({ error: "removeDirectory error: rm -Rf exited with code " + code + " for directory '" + directory + "'", code: 103 });
        }
        callback(null);
    });
}

function readDescriptor(path, callback) {

    fs.readFile(path, function (err, data) {

        if (err) {
            return callback("Error while reading the descriptor file: " + path);
        }

        var descriptor = null;

        try {
            descriptor = JSON.parse(data);
        } catch (err) {
            var error = "Invalid descriptor file (" + path + "): " + data.toString();
            return callback(error);
        }

        callback(null, descriptor);
    });
}

exports.copyDirectory = copyDirectory;
exports.makeDirectory = makeDirectory;
exports.removeDirectory = removeDirectory;

exports.readDescriptor = readDescriptor;
