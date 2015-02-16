var fs = require('fs');
var suffix = /\.\w+$/;
var checkFp = /\.@[a-z0-9]{7}\.(?:js|css)$/i;

// exports
exports.addToFiles = addFileFingerprints;
exports.cleanPath = cleanPath;

/**
 * Extend file name with the latest git commit id
 *
 * @public
 * @param {string} The module name, which contains the files.
 * @param {array} The file paths.
 * @param {object} The callback function.
 * @param {boolean} Attach the fingerprint as a query parameter.
 */
function addFileFingerprints (module, files, callback, query) {

    if (!files) {
        var err = new Error('No file informations.');
        console.error('lib/fingerprint.js#22', err.toString());
        return callback(err);
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
                cwd = engine.paths.app_modules + module + '/';
                file = cwd + files[index].substr(2);
                break;
            case '/':
                cwd = engine.repo;
                file = engine.paths.app_public + files[index].substr(1);
                break;
            default:
                cwd = engine.root + 'lib/client/';
                file = cwd + files[index];
        }

        // get the modification time
        fs.stat(file, function (err, stats) {

                // handle error
                if (err) {
                    console.error('lib/fingerprint.js#69', err.toString());
                    return callback(err);
                }

                // make fingerprint more unique
                stats = '@' + stats.mtime.getTime().toString(36).slice(-7);

                // handle files without suffix
                if (!suffix.test(file)) {

                    // update files
                    files[index] += '.' + stats;

                    // next loop
                    return handler(++index);
                }

                // append commit id as query
                if (query) {
                    files[index] += '?' + stats;

                    // next loop
                    return handler(++index);
                }

                // handle files with suffix
                file = files[index].split('.');
                file.splice(file.length - 1, 0, stats);

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

/**
 * Return an object with the fingerprint and the paht without it.
 *
 * @public
 * @param {string} The file path.
 */
function cleanPath (path) {

    var fingerprint = null;

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
