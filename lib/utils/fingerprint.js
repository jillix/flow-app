var env = process.env;
var exec = require('child_process').exec;
var path_repos = env.HOME + '/engine_repos/';
var suffix = /\.\w+$/;
var external = /^(?:\/\/|https?\:\/\/)/;
var checkFp = /\.@[a-z0-9]{7}\.(?:js|css)$/;
var git_log_cmd = 'git log -n1 --pretty=format:"%h" ';

exports.addToFiles = addFileFingerprints;
exports.getZ = getZFingerprint;
exports.cleanPath = cleanPath;

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
                if (err) {
                    return callback(err);
                }

                // make fingerprint more unique
                stdout = '@' + (stdout || uid(7));

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
        callback(null, '/' + env.Z_OP_KEY + '/' + env.Z_CORE_INST + '/' + env.Z_SEND_CLIENT_REQ + '/Z.@' + stdout + '.js');
    });
}

// check if a path has a fingerprint and retrun it
function cleanPath (path) {

    var fingerprint;

    // remove fingerprint if it's found in path
    if (checkFp.test(path)) {

        // split path
        path = path.split('.');

        // get fingerprint and remove fingerprint from read path
        fingerprint = path.splice(path.length - 2, 1)[0];

        // create path without fingerprint
        path = path.join('.');
    }

    // return path
    return {path: path, fingerprint: fingerprint};
}

// random string generator
function uid (len) {
    len = len || 23;

    var string = '';
    var i = 0;

    for (; i < len; ++i) {
        string += '012345678abcdef'[0 | Math.random() * 15];
    }
    return string;
}
