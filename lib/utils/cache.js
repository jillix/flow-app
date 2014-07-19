// TODO make this cache (horizontal) scalable
// TODO ttl

var M = process.mono;
var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime');

var dataKey = '_data';

module.exports = factory;

// create a new cache instance
function factory (config) {

    config = config || {};

    var cache = Cache.clone();
    cache[dataKey] = {};

    // set time to live
    if (config.ttl) {
        cache.ttl = config.ttl;
    }

    // set compression method
    if (config.zlib) {
        cache.zlib = config.zlib;
    }

    return cache;
}

// cache class
var Cache = {

    // set default compression method
    zlib: 'gzip',

    // get an item
    get: function (key) {
        return this[dataKey][key];
    },

    // get all items
    getAll: function () {
        return this[dataKey];
    },

    // save an item or file if no data is given
    save: function (key, data) {

        if (typeof data === 'function') {
            return saveFile.call(this, key, data);
        }

        this[dataKey][key] = data;
    },

    // remove an item
    rm: function (key) {
        if (typeof this[dataKey][key] !== 'undefined') {
            delete this[dataKey][key];
        }
    },

    // empty cache
    empty: function () {
        this[dataKey] = {};
    }
};

// read a file in the cache and update file on change
function  saveFile (path, callback, dontWatch) {
    var self = this;

    fs.readFile(path, function (err, data) {

        if (err) {
            return callback(err);
        }

        zlib[self.zlib](data, function (err, data) {

            if (err) {
                return callback(err);
            }

            fs.stat(path, function (err, stats) {

                if (err) {
                    return callback(err);
                }

                // watch file and update cache on change (only in dev mode?)
                if (!dontWatch) {
                    fs.watchFile(path, function (curr, prev) {

                        // update cache data
                        if(curr.mtime !== prev.mtime) {
                            saveFile.call(self, path, function () {}, true);
                        }
                    });
                }

                // save zipped data in cache
                self[dataKey][path] = data = {
                    data: data,
                    stats: stats,
                    mime: mime.lookup(path)
                };

                // return data
                callback(null, data);
            });
        });
    });
}
