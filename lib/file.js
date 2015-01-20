var env = process.env;
var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');
var minifyHtml = require('html-minifier').minify;
var minifyCSS =  require('clean-css');
var clone = engine.clone;
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

// this is not quaranteed to be stable!
zlib.Z_DEFAULT_COMPRESSION = 9;

module.exports = factory;

function factory (name, options) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = clone(Cache);

    // set observer
    cache.obs = new EventEmitter();

    // create data container
    cache._data = {};

    // working dir
    cache._wd = options.wd || env.Z_PATH_PROCESS_PUBLIC;

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

// FileCache
var Cache = {

    // remove one or all item(s)
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

    // return one or all item(s)
    get: function (path) {

        // return one item
        if (path) {
            return this._data[path];
        }

        // return all items
        return this._data;
    },

    // set an item
    set: function (path, callback, allowedFiles, prependPath) {
        var self = this;

        // clean path and get figerprint info
        var pathInfo = Fingerprint.cleanPath(path);

        // create a clean path without the fingerprint
        var cleanPath = (prependPath || '') + pathInfo.path;

        // check if the file is allowed
        if (allowedFiles) {

            var found = false;

            // try to find the file
            for (var i = 0; i < allowedFiles.length; ++i) {
                if (allowedFiles[i][0] !== '/' && allowedFiles[i].substr(2) === pathInfo.path) {
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
        var readPath = self._wd + (cleanPath[0] === '/' ? cleanPath.substr(1) : cleanPath);

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

                        // wrap javascript files
                        if (!self._noWrap) {
                            data = "Z.wrap('" + cleanPath + "',function(require,module,exports){\n" + data.toString() + "\nreturn module});";
                        }

                        if (env.Z_PRODUCTION && (data = UglifyJS.minify(data.toString(), {fromString: true}))) {
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
                'Cache-Control': 'public, max-age=' + (fingerprint ? env.Z_HTTP_CACHE_MAX_AGE_FINGERPRINT : env.Z_HTTP_CACHE_MAX_AGE),
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
