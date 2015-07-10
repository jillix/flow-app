var utils = require('./client/utils');

// cache data
var caches = {};

/**
 * The object cache factory.
 *
 * @public
 * @param {string} The unique file cache name.
 */
module.exports = function factory (name) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = utils.clone(Cache);

    // create data container
    cache._data = {};

    // save cache
    caches[name] = cache;

    return cache;
};

/**
 * The object cache class.
 *
 * @class Cache
 */
var Cache = {

    /**
     * Remove an object, or with no argument empty the cache.
     *
     * @public
     * @param {string} The file path.
     */
    rm: function (key) {

        // remove one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            return delete this._data[key];
        }

        // remove all items
        this._data = {};
    },

    /**
     * Get an object, or get all objects in the cache.
     *
     * @public
     * @param {string} The file path.
     */
    get: function (key) {

        // return one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            return this._data[key];
        }

        // return all items
        return this._data;
    },

     /**
     * Save an object in the cache.
     *
     * @public
     * @param {string} The object name.
     * @param {object} The data object.
     */
    set: function (key, data) {

        if (key) {
            this._data[key] = data;

            // save item ref also with cache alias
            if (data._cache_alias) {
                this._data[data._cache_alias] = data;
            }
        }
    }
};
