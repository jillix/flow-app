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
var getFile = exports.get = function getFile (file, callback) {

    if (typeof file === 'string') {
        file = {path: file};
    }

    // path must be absolute
    if (!file || !file.path || file.path.indexOf('../') !== -1) {
        var err = new Error('Invalid path.');
        console.error('lib/file.js#51', err.toString());
        return callback(err);
    }

    // set default base path to public app folder
    file.base = file.base || engine.paths.app_public;

    // create a clean path without the fingerprint
    file.clean = removeFingerprint(file.path);

    // create absolute path
    file.read = (file.base + file.clean).replace(/\/\//g, '\/');

    // check if file is already in cache
    var cachedFile = fileCache.get(file.read);
    if (cachedFile) {
        return callback(null, cachedFile);
    }

    // check if path had fingerprint
    file.fpInPath = file.fpInPath || (file.clean === file.path ? false : true);

    // get file type
    file.type = mime.lookup(file.clean);

    // read the file from the file system
    fs.readFile(file.read, function (err, data) {

        if (err) {
            console.error('lib/file.js#104', err.toString());
            return callback(err);
        }

        // minify js, html or css
        switch (file.type) {
            case 'text/html':

                // TODO don't compress as long html imports or binary ws data is available
                file.noCompression = true;
                data = minifyHtml(data.toString(), html_minifier_options);
                break;

            case 'text/css':
                data = new minifyCSS({processImport: false}).minify(data.toString()).styles;
                break;
            case 'application/javascript':

                // wrap javascript files, except the engine client
                if (file.wrap && file.path !== 'engine.js') {
                    data = "E('" + file.wrap + "',function(require,module,exports,global,engine){\n" + data.toString() + "\nreturn module});";
                }

                if (engine.production && (data = UglifyJS.minify(data.toString(), {fromString: true}))) {
                    data = data.code;
                }
                break;
        }

        // create fingerprint
        file.fp = crypto.createHash('md5').update(data).digest('hex').substr(0, 7);

        // add the data to the file object
        file.data = data;

        // don't compress data
        if (file.noCompression) {
            return createCacheObject(file, callback);
        }

        zlib.gzip(file.data, function (err, data) {

            if (err) {
                console.error('lib/file.js#218', err.toString());
                return callback(err);
            }

            // update file data with compressed data
            file.data = data;

            createCacheObject(file, callback);
        });
    });
};

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
function createCacheObject (file, callback) {

    // get the modification time
    fs.stat(file.read, function (err, stats) {

        if (err) {
            console.error('lib/file.js#245', err.toString());
            return callback(err);
        }

        // watch for file changes
        if (file !== null) {
            fs.watch(file.read, function (event) {

                // remove cached data on file change, to force reload
                if (event === 'change') {
                    console.log('FILE CHANGE:', file.read);

                    // set file item to null
                    fileCache.set(file.read, null);
                }
            });
        }

        // create http headers
        // TODO send not modified for non scrips and css
        file.http = {
            'Vary': 'Accept-Encoding',
            'Cache-Control': 'public, max-age=' + (file.fpInPath ? engine.http.maxAge_fingerprint : engine.http.maxAge),
            'Content-Encoding': 'gzip',
            'Content-Length': file.data.length,
            'Content-Type': file.type,
            'Last-Modified': stats.mtime,
            'Etag': file.fp
        };

        // save zipped data in cache
        fileCache.set(file.read, file);

        // return data
        callback(null, file);
    });
}

/**
 * Prepare external component file paths.
 *
 * @public
 * @param {object} The load context, ex a module package.
 * @param {function} The callback function.
 */
exports.prepareComponents = function (loadContext, callback) {

    if (!loadContext || !loadContext.components) {
        var err = new Error('Invalid load context.');
        console.error('lib/file.js#227', err.toString());
        return callback(err);
    }

    // check if there are components to load
    if (
        (!loadContext.components.scripts || !loadContext.components.scripts.length) &&
        (!loadContext.components.markup || !loadContext.components.markup.length) &&
        (!loadContext.components.styles || !loadContext.components.styles.length)
    ) {
        return callback(null, loadContext);
    }

    var count = 0;
    var handler = function (err, file) {

        if (err) {
            console.error('lib/file.js#221', err.toString());
            if (--count === 0) {
                callback(null, loadContext);
            }
            return;
        }

        // TODO don't append fingerprints to the markup until it's loaded via html import
        if (file.compType !== 'markup') {

            // get fingerprint
            var fingerprint = '@' + file.fp;

            // handle files with suffix
            if (suffix.test(file.clean)) {

                file.ext = file.path.split('.');
                file.ext.splice(file.ext.length - 1, 0, fingerprint);
                file.ext = file.ext.join('.');

            // handle files without suffix
            } else {
                file.ext = file.path + '.' + fingerprint;
            }
        }

        // add module id to module paths
        file.ext = (file.path[0] !== '/' ? loadContext._id + '/' : '') + (file.ext || file.path);

        // update module components paths
        if (loadContext.components[file.compType] && loadContext.components[file.compType][file.index]) {
            loadContext.components[file.compType][file.index] = file.ext;
        }

        if (--count === 0) {
            callback(null, loadContext);
        }
    }

    for (var type in loadContext.components) {

        // checl if type is allowed
        switch (type) {
            case 'scripts':
            case 'markup':
            case 'styles':
                break;
            default:
              continue;
        }

        // get file paths array
        var files = loadContext.components[type];

        // update count
        count += files.length;

        for (var i = 0, file; i < files.length; ++i) {

            // ignore external paths
            if (files[i].indexOf('//') > -1) {
                if (--count === 0) {
                    callback(null, loadContext);
                }
                continue;
            }

            // create file object
            file = {path: files[i]};

            // preserve the index to update the component
            file.index = i;

            // save component type to update the components later
            file.compType = type;

            // set a longer cache time for fingerprinted files
            file.fpInPath = true;

            // append base path
            file.base = loadContext._base || (type === 'markup' ? engine.paths.app_markup : engine.paths.app_public);

            // wrap javascript files
            if (file.path[0] !== '/' && type === 'scripts') {
                file.wrap = loadContext._id + '/' + file.path;
            }

            // read the file
            getFile(file, handler);
        }
    }
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
