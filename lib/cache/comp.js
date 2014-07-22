var env = process.env;
var fs = require('fs');

// save caches
var caches = {};

module.exports = factory;

function factory (type) {

    // return existing cache
    if (caches[type]) {
        return caches[type];
    }

    // clone cache class
    var cache = Cache.clone();

    // create data container
    cache._data = {};

    // save path on cache instance
    cache._path = env.Z_PATH_PROCESS_COMPOSITION + type + '/';

    // save cache
    caches[type] = cache;

    return cache;
}

// FileCache
var Cache = {

    // remove one or all item(s)
    rm: function (name) {

        // remove one item
        if (name) {
            return delete this._data[name];
        }

        // remove all items
        this._data = {};
    },

    // return one or all item(s)
    get: function (name) {

        // return one item
        if (name) {
            return this._data[name];
        }

        // return all items
        return this._data;
    },

    // set an item
    set: function readJsonFile (name, callback, dontWatch) {
        var self = this;

        // check if object is already in cache
        if (!dontWatch && self._data[name]) {
            return callback(null, self._data[name]);
        }

        // create path to json file
        var path = self._path + name + '.json';

        fs.readFile(path, function (err, data) {

            if (err) {
                return callback(err);
            }

            // parse json file and save object in cache
            try {
                self._data[name] = data = JSON.parse(data);
            } catch (err) {
                return callback(err);
            }

            // watch file
            if (!dontWatch) {
                fs.watch(path, function (event) {

                    // update cache data on file change
                    if (event === 'change') {
                        self.set(name, function () {}, true);
                    }
                });
            }

            // return data
            callback(null, data);
        });
    }
};
