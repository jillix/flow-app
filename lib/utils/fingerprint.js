var env = process.env;
var exec = require('child_process').exec;
var path_repos = env.HOME + '/engine_repos/';
var suffix = /\.\w+$/;

exports.addToFiles = addFileFingerprints;
exports.getZ = getZFingerprint;

// get latest commit ids of files
function addFileFingerprints (root, files, callback) {

    if (!files) {
        return callback(new Error('No file informations.'));
    }

    // create command
    var command = '';
    for (var i = 0; i < files.length; ++i) {
        command += 'git log -n1 --pretty=format:"%h\n" ' + root + files[i] + ' && ';
    }
    command = command.slice(0, -4);

    // execute command
    exec(command, {cwd: env.Z_PATH_PROCESS_REPO}, function (err , stdout, stderr) {

        if (err || !stdout) {
            return callback(err || new Error('No commit ids found.'));
        }

        // update files paths with the short git commit id
        var fingerprints = stdout.split('\n').slice(0, -1);
        for (var i = 0, file; i < files.length; ++i) {

            // handle files without suffix
            if (!suffix.test(files[i])) {
                files[i] += '.' + fingerprints[i];
                continue;
            }

            // handle files with suffix
            file = files[i].split('.');
            file.splice(file.length - 1, 0, fingerprints[i]);
            files[i] = file.join('.');
        }

        callback(null, files);
    });
}

// add a fingerprint to a file path
function getZFingerprint (callback) {

    exec('git log -n1 --pretty=format:"%h" lib/client/Z.js', {cwd: env.Z_PATH_ENGINE}, function (err , stdout, stderr) {

        if (err || !stdout) {
            return callback(err || new Error('No commit id for "Z.js" found.'));
        }

        // append fingerprint to Z.js
        callback(null, '/' + env.Z_OP_KEY + '/' + env.Z_CORE_INST + '/' + env.Z_SEND_CLIENT_REQ + '/Z.' + stdout + '.js');
    });
}
