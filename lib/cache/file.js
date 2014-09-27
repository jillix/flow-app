var env = process.env;
var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');
var minifyHtml = require('html-minifier').minify;
var minifyCSS =  require('clean-css');

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

// save caches
var caches = {};

// this is not quaranteed to be stable!
zlib.Z_DEFAULT_COMPRESSION = 9;

module.exports = factory;

function factory (name, noCompression, dontOptimize) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = Cache.clone();

    // create data container
    cache._data = {};

    // configure compression
    cache._noCompression = noCompression;

    // dont optimize html and css
    cache._dontOptimize = dontOptimize;

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
            return delete this._data[path];
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
    set: function (path, callback, dontWatch, moduleFile) {
        var self = this;

        // check if file is already in cache
        if (!dontWatch && self._data[path]) {
            return callback(null, self._data[path]);
        }

        // path must be absolute
        if (path.indexOf('../') !== -1) {
            return callback(new Error('Invalid path.'));
        }

        var mimeType = mime.lookup(path);
        var fingerprint = '';
        var cachePath = path;

        // get filename fingerprint
        if (mimeType === 'text/css' || mimeType === 'application/javascript') {

            // split path
            path = path.split('.');

            // get fingerprint and remove fingerprint from read path
            fingerprint = path.splice(path.length - 2, 1)[0];

            // create path without fingerprint
            path = path.join('.');
        }

        fs.readFile(path, function (err, data) {

            if (err) {
                return callback(err);
            }

            // wrap module code files
            if (moduleFile) {
                data = new Buffer("Z.wrap('" + moduleFile + "',function(require,module,exports){\n" + data.toString() + "\nreturn module});");

            // optimize html or css
            } else if (!self._dontOptimize) {
                switch (mimeType) {
                    case 'text/html':
                        data = minifyHtml(data.toString('utf8'), html_minifier_options);
                        break;
                    case 'text/css':
                        data = new minifyCSS({processImport: false}).minify(data.toString('utf8'));
                        break;
                    case 'application/javascript':
                        // TODO minify scripts
                        break;
                }
            }

            // don't compress data
            if (self._noCompression) {
                return createCacheObject.call(self, path, data, mimeType, fingerprint, cachePath, callback, dontWatch);
            }

            zlib.gzip(data, function (err, data) {

                if (err) {
                    return callback(err);
                }

                createCacheObject.call(self, path, data, mimeType, fingerprint, cachePath, callback, dontWatch);
            });
        });
    }
};

function createCacheObject (path, data, mimeType, fingerprint, cachePath, callback, dontWatch) {
    var self = this;

    fs.stat(path, function (err, stats) {

        if (err) {
            return callback(err);
        }

        // watch file and update cache on change
        if (!dontWatch) {
            fs.watch(path, function (event) {

                // update cache data on file change
                if (event === 'change') {
                    self.set(path, function () {}, true);
                }
            });
        }

        // save zipped data in cache
        self._data[cachePath] = data = {
            data: data,

            // create http headers
            // TODO send not modified for non scrips and css
            http: {
                'Cache-Control': 'public, max-age=' + (fingerprint ? env.Z_HTTP_CACHE_MAX_AGE_FINGERPRINT : env.Z_HTTP_CACHE_MAX_AGE),
                'Vary': 'Accept-Encoding',
                'Last-Modified': stats.mtime,
                'Content-Encoding': 'gzip',
                'Content-Length': data.length,
                'Content-Type': mimeType,
                'Server': 'JCES'
            }
        };

        // return data
        callback(null, data);
    });
}
