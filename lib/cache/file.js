var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');

// save caches
var caches = {};

// this is not quaranteed to be stable!
zlib.Z_DEFAULT_COMPRESSION = 9;

module.exports = factory;

function factory (name, noCompression) {

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
    set: function (path, callback, dontWatch) {
        var self = this;

        // check if file is already in cache
        if (!dontWatch && self._data[path]) {
            return callback(null, self._data[path]);
        }

        // path must be absolute
        if (path.indexOf('../') !== -1) {
            return callback(new Error('Invalid path.'));
        }

        fs.readFile(path, function (err, data) {

            if (err) {
                return callback(err);
            }

            // don't compress data
            if (self._noCompression) {
                return createCacheObject.call(self, path, data, callback, dontWatch);
            }

            zlib.gzip(data, function (err, data) {

                if (err) {
                    return callback(err);
                }

                createCacheObject.call(self, path, data, callback, dontWatch);
            });
        });
    }
};

function createCacheObject (path, data, callback, dontWatch) {
    var self = this;

    fs.stat(path, function (err, stats) {

        if (err) {
            return callback(err);
        }

        // watch file and update cache on change (only in dev mode? i think so..)
        if (!dontWatch) {
            fs.watch(path, function (event) {

                // update cache data on file change
                if (event === 'change') {
                    self.set(path, function () {}, true);
                }
            });
        }

        // save zipped data in cache
        self._data[path] = data = {
            data: data,

            // create http headers
            http: {
                'Cache-Control': 'public, max-age=31536000',
                'Vary': 'Accept-Encoding',
                'Last-Modified': stats.mtime,
                'Content-Encoding': 'gzip',
                'Content-Length': data.length,
                'Content-Type': mime.lookup(path),
                'Server': 'JCES'
            }
        };

        // return data
        callback(null, data);
    });
}
