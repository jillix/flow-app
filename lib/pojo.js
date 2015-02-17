// cache data
var caches = {};

/**
 * The object cache factory.
 *
 * @public
 * @param {string} The unique file cache name.
 * @param {boolean} Check role or not.
 */
module.exports = function factory (name, checkRole) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = engine.clone(Cache);

    // create data container
    cache._data = {};

    // check role access
    cache._roleCheck = checkRole;

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
    rm: function (key, role) {

        // remove one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            // check role access
            if (this._roleCheck && !engine.roleAccess(this._data[key], role)) {
                return 0;
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
    get: function (key, role) {

        // return one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            // check role access
            if (this._roleCheck && !engine.roleAccess(this._data[key], role)) {
                return 0;
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
    set: function (key, data, role) {

        if (key) {

            // check access before overwrite
            if (this._data[key] !== undefined && this._roleCheck && !engine.roleAccess(this._data[key], role)) {
                return 0;
            }

            this._data[key] = data;
        }
    }
};
