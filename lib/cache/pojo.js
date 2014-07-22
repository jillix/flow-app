// save caches
var caches = {};

module.exports = factory;

function factory (name) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = Cache.clone();

    // create data container
    cache._data = {};

    // save cache
    caches[name] = cache;

    return cache;
}

// FileCache
var Cache = {

    // remove one or all item(s)
    rm: function (key) {

        // remove one item
        if (key) {
            return delete this._data[key];
        }

        // remove all items
        this._data = {};
    },

    // return one or all item(s)
    get: function (key) {

        // return one item
        if (key) {
            return this._data[key];
        }

        // return all items
        return this._data;
    },

    // set an item
    set: function (key, data) {

        if (key) {
            this._data[key] = data;
        }
    }
};
