/**
 * The file cache class.
 *
 * @class Cache
 */
var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');
var crypto = require('crypto');
var minifyHtml = require('html-minifier').minify;
var minifyCSS =  require('clean-css');
var UglifyJS = require('uglify-js');
var html_minifier_options = {
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeCDATASectionsFromCDATA: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    collapseBooleanAttributes: true,
    collapseWhitespace: true
};

// regular expressions
//var removeFingerprint = /\.[^\.]+\.js$/;
var suffix = /\.\w+$/;
var checkFp = /\.@[a-z0-9]{7}\.(?:js|css|html)$/i;

// global file cache
var fileCache = engine.pojo('files');

// this is not quaranteed to be stable! why?
zlib.Z_DEFAULT_COMPRESSION = 9;

/**
 * Read a file or get it from the cache.
 *
 * @public
 * @param {string} The file path.
 * @param {function} The callback function.
 * @param {array} Give an array with allowed paths. (optional)
 * @param {string} A string, which is prepended to a path.
 */
exports.get = getFile;
function getFile (parentDir, path, callback, options) {

    // path must be absolute
    if (path.indexOf('../') !== -1) {
        var err = new Error('Invalid path.');
        console.error('lib/file.js#80', err.toString());
        return callback(err);
    }

    options = options || {};

    // set default working dir to public app folder
    parentDir = parentDir || engine.paths.app_public;

    // check if the file is allowed
    if (options.allowedFiles) {

        var found = false;

        // try to find the file
        for (var i = 0; i < options.allowedFiles.length; ++i) {
            if (options.allowedFiles[i].replace(/^\.\//, '') === path) {
                found = true;
                break;
            }
        }

        // return not found if requested file is not found in "allowedFiles"
        if (!found) {
            var err = new Error('File not found.');
            console.error('lib/file.js#158', err.toString());
            return callback(err);
        }
    }

    // create a clean path without the fingerprint
    var cleanPath = removeFingerprint(path);

    // check if path had fingerprint
    var hasFingerprint = cleanPath === path ? false : true;

    // TODO this looks a little whacky.. find a better way to distinct core client and module client files
    var readPath = parentDir + (options.allowedFiles ? (options.prependPath || '') : '') + (cleanPath[0] === '/' ? cleanPath.substr(1) : cleanPath);

    // check if file is already in cache
    var file = fileCache.get(readPath);

    if (file) {
        return callback(null, file, true);
    }

    readFile(file, parentDir, readPath, cleanPath, options, hasFingerprint, callback);
};

function readFile (file, parentDir, path, cleanPath, options, hasFingerprint, callback) {

    var mimeType = mime.lookup(path);
    fs.readFile(path, function (err, data) {

        if (err) {
            console.error('lib/file.js#122', err.toString());
            return callback(err);
        }

        // minify js, html or css
        switch (mimeType) {
            case 'text/html':
                data = minifyHtml(data.toString(), html_minifier_options);
                break;
            case 'text/css':
                data = new minifyCSS({processImport: false}).minify(data.toString()).styles;
                break;
            case 'application/javascript':

                // wrap javascript files, except the engine client
                if (cleanPath !== 'engine.js') {
                    data = "E('" + (options.prependPath || '') + cleanPath + "',function(require,module,exports,global,engine){\n" + data.toString() + "\nreturn module});";
                }

                if (engine.production && (data = UglifyJS.minify(data.toString(), {fromString: true}))) {
                    data = data.code;
                }
                break;
        }

        // create fingerprint
        var fingerprint = crypto.createHash('md5').update(data).digest('hex').substr(7);

        // don't compress data
        if (options.noCompression) {
            return createCacheObject(file, cleanPath, path, data, mimeType, fingerprint, hasFingerprint, callback);
        }

        zlib.gzip(data, function (err, data) {

            if (err) {
                console.error('lib/file.js#218', err.toString());
                return callback(err);
            }

            createCacheObject(file, cleanPath, path, data, mimeType, fingerprint, hasFingerprint, callback);
        });
    });
}

/**
 * Create an cache object with the data buffer and the http headers.
 *
 * @private
 * @param {string} The file name without the fingerprint.
 * @param {string} The file path wihtout the fingerprint.
 * @param {blob} The file data.
 * @param {string} The mime type.
 * @param {string} The fingerprint.
 * @param {function} The callback function.
 */
function createCacheObject (file, cleanPath, readPath, data, mimeType, fingerprint, hasFingerprint, callback) {

    // get the modification time
    fs.stat(readPath, function (err, stats) {

        if (err) {
            console.error('lib/file.js#245', err.toString());
            return callback(err);
        }

        // watch for file changes
        if (file !== null) {
            fs.watch(readPath, function (event, filename) {

                // remove cached data on file change, to force reload
                if (event === 'change') {
                    console.log('FILE CHANGE:', readPath);

                    // set file item to null
                    fileCache.set(readPath, null);
                }
            });
        }

        data = {
            data: data,
            path: cleanPath,

            // create http headers
            // TODO send not modified for non scrips and css
            http: {
                'Vary': 'Accept-Encoding',
                'Cache-Control': 'public, max-age=' + (hasFingerprint ? engine.http.maxAge_fingerprint : engine.http.maxAge),
                'Content-Encoding': 'gzip',
                'Content-Length': data.length,
                'Content-Type': mimeType,
                'Last-Modified': stats.mtime,
                'Etag': fingerprint
            }
        };

        // know if item was removed due a composition change or manual
        var changed = file === null ? true : false;

        // save zipped data in cache
        fileCache.set(readPath, data);

        // return data
        callback(null, data, changed);
    });
}

/**
 * Extend file name with a content hash
 *
 * @public
 * @param {string} The module name, which contains the files.
 * @param {array} The file paths.
 * @param {object} The callback function.
 * @param {boolean} Attach the fingerprint as a query parameter.
 */
exports.addFingerprints = function (parentDir, files, callback, options) {

    if (!files) {
        var err = new Error('No file informations.');
        console.error('lib/fingerprint.js#22', err.toString());
        return callback(err);
    }

    if (files.length === 0) {
        return callback();
    }

    options = options || {};

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

        var file = files[index];

        // load file in cache and get fingerprint
        getFile(parentDir, file, function (err, fingerprint) {

            // handle error
            if (err) {
                console.error('lib/fingerprint.js#69', err.toString());
                return callback(err);
            }

            // get fingerprint
            fingerprint = '@' + fingerprint.http.Etag.substr(0, 7);

            // handle files without suffix
            if (!suffix.test(file)) {

                // update files
                files[index] += '.' + fingerprint;

                // next loop
                return handler(++index);
            }

            // append commit id as query
            if (options.query) {
                files[index] += '?' + fingerprint;

                // next loop
                return handler(++index);
            }

            // handle files with suffix
            file = files[index].split('.');
            file.splice(file.length - 1, 0, fingerprint);

            // update files
            files[index] = file.join('.');

            // next loop
            handler(++index);
        }, options);
    };

    // start recursive loop
    handler(0);
}

/**f
 * Remove fingerprint from path
 *
 * @private
 * @param {string} The file path.
 */
function removeFingerprint (path) {

    // remove fingerprint if it's found in path
    if (checkFp.test(path)) {

        // split path
        path = path.split('.');

        // get fingerprint and remove fingerprint from read path
        path.splice(path.length - 2, 1)[0];

        // create path without fingerprint
        path = path.join('.');
    }

    // return path
    return path;
}
