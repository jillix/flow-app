var env = process.env;
var fs = require('fs-extra');
var clone = require(env.Z_PATH_UTILS + 'object').clone;

// save caches
var caches = {};

module.exports = factory;

function factory (type) {

    // return existing cache
    if (caches[type]) {
        return caches[type];
    }

    // clone cache class
    var cache = clone(Cache);

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
    rm: function (name, role) {

        // remove one item
        if (name) {

            if (!this._data[name]) {
                return;
            }

            // check role access
            if (!checkRoleAccess(this._data[name], role)) {
                return 0;
            }

            return delete this._data[name];
        }

        // remove all items
        this._data = {};
    },

    // get an item
    get: function (name, role, callback) {
        var self = this;

        // check if object is already in cache
        if (self._data[name]) {

            // check role access
            if (!checkRoleAccess(self._data[name], role)) {
                return callback(null, 0);
            }

            return callback(null, self._data[name]);
        }

        // create path to json file
        var path = self._path + name + '.json';

        fs.readJson(path, function (err, data) {

            if (err) {
                return callback(err);
            }

            // save object in cache
            self._data[name] = data;

            // check role access
            if (!checkRoleAccess(data, role)) {
                return callback(null, 0);
            }

            // watch file
            if (self._data[name] !== null) {
                fs.watch(path, function (event) {

                    // update cache data on file change
                    if (event === 'change' && self._data[name]) {
                        self._data[name] = null;
                    }
                });
            }

            // return data
            callback(null, data);
        });
    }
};

function checkRoleAccess (item, role) {

    if (item.roles['*'] || (item.roles && item.roles[role])) {
        return true;
    }
}
