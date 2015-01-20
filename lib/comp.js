var env = process.env;
var fs = require('fs-extra');
var clone = engine.clone;
var pojo = require('./pojo');

// get event emitter module
var EventEmitter = require('events').EventEmitter;

// save caches
var caches = {};

module.exports = factory;

function factory (name) {

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

    // save path on cache instance
    cache._path = env.Z_PATH_PROCESS_COMPOSITION + name + '/';

    // create pojo cache
    cache.pojo = pojo(name, true);

    // save cache
    caches[name] = cache;

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

            // remove cached item
            delete this._data[name];

            // remove pojo object
            this.pojo.rm(name, role);

            // emit item remove event
            this.obs.emit('remove:' + name);

            return;
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

            // check role access
            if (!checkRoleAccess(data, role)) {
                return callback(null, 0);
            }

            // watch file
            if (self._data[name] !== null) {
                fs.watch(path, function (event) {

                    // remove cached data on file change, to force reload
                    if (event === 'change' && self._data[name]) {
                        self._data[name] = null;

                        // remove pojo object
                        self.pojo.rm(name, role);

                        // emit item change event
                        self.obs.emit('change:' + name);
                    }
                });
            }

            // know if item was removed due a composition change or manual
            var changed = self._data[name] === null ? true : false;

            // save object in cache
            self._data[name] = data;

            // return data
            callback(null, data, changed);
        });
    }
};

function checkRoleAccess (item, role) {

    if (item.roles['*'] || (item.roles && item.roles[role])) {
        return true;
    }
}
