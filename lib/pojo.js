var env = process.env;
var clone = engine.clone;

// save caches
var caches = {};

module.exports = factory;

function factory (name, checkRole) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = clone(Cache);

    // create data container
    cache._data = {};

    // check role access
    cache._roleCheck = checkRole;

    // save cache
    caches[name] = cache;

    return cache;
}

// FileCache
var Cache = {

    // remove one or all item(s)
    rm: function (key, role) {

        // remove one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            // check role access
            if (this._roleCheck && !checkRoleAccess(this._data[key], role)) {
                return 0;
            }

            return delete this._data[key];
        }

        // remove all items
        this._data = {};
    },

    // return one or all item(s)
    get: function (key, role) {

        // return one item
        if (key) {

            // return if key does not exists
            if (this._data[key] === undefined) {
                return;
            }

            // check role access
            if (this._roleCheck && !checkRoleAccess(this._data[key], role)) {
                return 0;
            }

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

function checkRoleAccess (item, role) {

    if (item._roles['*'] || (item._roles && item._roles[role])) {
        return true;
    }
}
