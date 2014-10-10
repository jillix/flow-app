var env = process.env;
var exec = require('child_process').exec;
var path_repos = env.HOME + '/engine_repos/';
var suffix = /\.\w+$/;
var external = /^(?:\/\/|https?\:\/\/)/;
var git_log_cmd = 'git log -n1 --pretty=format:"%h" ';

exports.addToFiles = addFileFingerprints;
exports.getZ = getZFingerprint;

// get latest commit ids of files
function addFileFingerprints (module, files, callback, query) {

    if (!files) {
        return callback(new Error('No file informations.'));
    }

    if (files.length === 0) {
        return callback();
    }

    // recursive handler
    var handler = function (index) {

        // call back when all file path are updated
        if (!files[index]) {
            return callback(null, files);
        }

        // check if file points to an external source
        if (files[index].indexOf('//') > -1) {
            return handler(++index);
        }

        var file;
        var cwd;

        // get working directory and file path
        switch (files[index][0]) {
            case '.':
                cwd = env.Z_PATH_PROCESS_MODULES + module;
                file = cwd + files[index].substr(2);
                break;
            case '/':
                cwd = env.Z_PATH_PROCESS_REPO;
                file = env.Z_PATH_PROCESS_PUBLIC + files[index].substr(1);
                break;
            default:
                return callback(new Error('Invalid script path: ' + files[index]));
        }

        // get the commit id
        exec(
            git_log_cmd + file,
            {cwd: cwd},
            function (err, stdout, stderr) {

                // handle error
                if (err || !stdout) {
                    return callback(err || new Error('No commit id found for "' + file + '" in repo "' + cwd + '"'));
                }

                // handle files without suffix
                if (!suffix.test(file)) {

                    // update files
                    files[index] += '.' + stdout;

                    // next loop
                    return handler(++index);
                }

                // append commit id as query
                if (query) {
                    files[index] += '?' + stdout;

                    // next loop
                    return handler(++index);
                }

                // handle files with suffix
                file = files[index].split('.');
                file.splice(file.length - 1, 0, stdout);

                // update files
                files[index] = file.join('.');

                // next loop
                handler(++index);
            }
        );
    };

    // start recursive loop
    handler(0);
}

// add a fingerprint to a file path
function getZFingerprint (callback) {

    exec(git_log_cmd + 'lib/client/Z.js', {cwd: env.Z_PATH_ENGINE}, function (err , stdout, stderr) {

        if (err || !stdout) {
            return callback(err || new Error('No commit id for "Z.js" found.'));
        }

        // append fingerprint to Z.js
        callback(null, '/' + env.Z_OP_KEY + '/' + env.Z_CORE_INST + '/' + env.Z_SEND_CLIENT_REQ + '/Z.' + stdout + '.js');
    });
}
