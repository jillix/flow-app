var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');
var minifyHtml = require('html-minifier').minify;
var minifyCSS =  require('clean-css');
var UglifyJS = require('uglify-js');
var Fingerprint = require('./fingerprint');

// get event emitter module
var EventEmitter = require('events').EventEmitter;

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

// remove fingerprint from script files
var reRemoveFingerprint = /\.[^\.]+\.js$/;

// save caches
var caches = {};

// this is not quaranteed to be stable! why?
zlib.Z_DEFAULT_COMPRESSION = 9;

// export the file cache factory
module.exports = factory;

/**
 * The file cache factory.
 *
 * @public
 * @param {string} The unique file cache name.
 * @param {object} Options for the file cache.
 */
function factory (name, options) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = engine.clone(Cache);

    // set observer
    cache.obs = new EventEmitter();

    // create data container
    cache._data = {};

    // working dir
    cache._wd = options.wd || engine.paths.app_public;

    // dont wrap js code
    cache._noWrap = options.noWrap;

    // configure compression
    cache._noCompression = options.noCompression;

    // dont optimize html and css
    cache._dontOptimize = options.dontOptimize;

    // save cache
    caches[name] = cache;

    return cache;
}

/**
 * The file cache class.
 *
 * @class Cache
 */
var Cache = {

    /**
     * Remove a file from the cache. Or with no argument empty the cache.
     *
     * @public
     * @param {string} The file path.
     */
    rm: function (path) {

        // remove one item
        if (path) {

            delete this._data[path];

            // emit item remove event
            this.obs.emit('remove:' + path);

            return;
        }

        // remove all items
        this._data = {};
    },

    /**
     * Get a file, or get all files in the cache.
     *
     * @public
     * @param {string} The file path.
     */
    get: function (path) {

        // return one item
        if (path) {
            return this._data[path];
        }

        // return all items
        return this._data;
    },

    /**
     * Save an file in the cache.
     *
     * @public
     * @param {string} The file path.
     * @param {function} The callback function.
     * @param {array} Give an array with allowed paths. (optional)
     * @param {string} A string, which is prepended to a path.
     */
    set: function (path, callback, allowedFiles, prependPath) {
        var self = this;

        // clean path and get figerprint info
        var pathInfo = Fingerprint.cleanPath(path);

        // create a clean path without the fingerprint
        var cleanPath = pathInfo.path;

        // check if the file is allowed
        if (allowedFiles) {

            var found = false;

            // try to find the file
            for (var i = 0; i < allowedFiles.length; ++i) {
                if (allowedFiles[i].replace(/^\.\//, '') === path) {
                    found = true;
                    break;
                }
            }

            // return not found if requested file is not found in "allowedFiles"
            if (!found) {
                return callback(new Error('File not found.'));
            }
        }

        // path must be absolute
        if (cleanPath.indexOf('../') !== -1) {
            return callback(new Error('Invalid path.'));
        }

        // check if file is already in cache
        if (self._data[cleanPath]) {
            return callback(null, self._data[cleanPath], true);
        }

        var mimeType = mime.lookup(cleanPath);

        // TODO this looks a little whacky.. find a better way to distinct core client and module client files
        var readPath = self._wd + (allowedFiles ? (prependPath || '') : '') + (cleanPath[0] === '/' ? cleanPath.substr(1) : cleanPath);

        fs.readFile(readPath, function (err, data) {

            if (err) {
                return callback(err);
            }

            // minify js, html or css
            if (!self._dontOptimize) {
                switch (mimeType) {
                    case 'text/html':
                        //data = minifyHtml(data.toString(), html_minifier_options);
                        break;
                    case 'text/css':
                        data = new minifyCSS({processImport: false}).minify(data.toString());
                        break;
                    case 'application/javascript':

                        // wrap javascript files, except the engine client
                        if (cleanPath !== 'engine.js' && !self._noWrap) {
                            data = "E('" + (prependPath || '') + cleanPath + "',function(require,module,exports){\n" + data.toString() + "\nreturn module});";
                        }

                        if (engine.production && (data = UglifyJS.minify(data.toString(), {fromString: true}))) {
                            data = data.code;
                        }
                        break;
                }
            }

            // don't compress data
            if (self._noCompression) {
                return createCacheObject.call(self, cleanPath, readPath, data, mimeType, pathInfo.fingerprint, callback);
            }

            zlib.gzip(data, function (err, data) {

                if (err) {
                    return callback(err);
                }

                createCacheObject.call(self, cleanPath, readPath, data, mimeType, pathInfo.fingerprint, callback);
            });
        });
    }
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
function createCacheObject (cleanPath, readPath, data, mimeType, fingerprint, callback) {
    var self = this;

    fs.stat(readPath, function (err, stats) {

        if (err) {
            return callback(err);
        }

        // watch for file changes
        if (self._data[cleanPath] !== null) {
            fs.watch(readPath, function (event, filename) {

                // remove cached data on file change, to force reload
                if (event === 'change' && self._data[cleanPath]) {
                    self._data[cleanPath] = null;

                    // emit item change event
                    self.obs.emit('change:' + cleanPath);
                }
            });
        }

        data = {
            data: data,

            // create http headers
            // TODO send not modified for non scrips and css
            http: {
                'Cache-Control': 'public, max-age=' + (fingerprint ? engine.http.maxAge_fingerprint : engine.http.maxAge),
                'Vary': 'Accept-Encoding',
                'Last-Modified': stats.mtime,
                'Content-Encoding': 'gzip',
                'Content-Length': data.length,
                'Content-Type': mimeType
            }
        };

        // append fingerprint also as etag
        if (fingerprint) {
            data.http.Etag = fingerprint;
        }

        // know if item was removed due a composition change or manual
        var changed = self._data[cleanPath] === null ? true : false;

        // save zipped data in cache
        self._data[cleanPath] = data;

        // return data
        callback(null, data, changed);
    });
}
