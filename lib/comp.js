// require fs extra
var fs = require('fs-extra');

// save caches
var caches = {};

/**
 * Create a new module instance cache
 *
 * @public
 * @param {string} The module instance cache name.
 * @param {function} The factory method.
 */
module.exports = function (name, factory) {

    // return existing cache
    if (caches[name]) {
        return caches[name];
    }

    // clone cache class
    var cache = engine.clone(Cache);

    // save factory method
    cache.factory = factory;

    // cache module packages info
    cache._modules = {};

    // cache the running module instances
    cache._data = {};

    // save cache
    caches[name] = cache;

    return cache;
};

/**
 * The composition cache class.
 *
 * @class Cache
 */
var Cache = {

    /**
     * Remove a module instance or empty cache.
     *
     * @public
     * @param {string} The module instance name.
     * @param {string} The role name.
     */
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

            return;
        }

        // remove all items
        this._data = {};
    },

    /**
     * Get or create a module instance.
     *
     * @public
     * @param {string} The module instance name.
     * @param {string} The role name.
     * @param {function} The callback function.
     */
    get: function (name, role, callback) {
        var self = this;

        // check if object is already in cache
        if (self._data[name]) {

            var data = self._data[name];
            var error;

            // check role access
            if (!checkRoleAccess(self._data[name], role)) {
                data = undefined;
                error = new Error('access denied.');
            }

            // return cached instance or call the callback
            return callback ? callback(error, data) : error || data;
        }

        // dont load composition, when no callback is given
        if (!callback) {
            return;
        }

        // create path to composition file
        var path =  engine.paths.app_composition + name + '.json';

        // read the composition json
        fs.readJson(path, function (err, composition) {

            // handle error and check role access
            if (err || !checkRoleAccess(composition, role)) {
                return callback(err || new Error('access denied.'));
            }

            // watch file
            if (self._data[name] !== null) {
                fs.watch(path, function (event) {

                    // remove cached data on file change, to force reload
                    if (event === 'change' && self._data[name]) {

                        // remove the cached item
                        self._data[name] = null;
                    }
                });
            }

            // get the module's package infos
            getPackackeInfo.call(self, composition.module, function (err, moduleConfig) {

                // extend module instance config with the module dependencies
                composition.client = composition.client || {};

                // all dependencies of the instance dependencies must be in this array!
                // while installing a module, save all dependencies in the module deps
                // dependencies: ['./file.js', 's/o/modA/v']
                // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
                // => to client: ['./file.js', 's/o/n/v/file.js']
                composition.client.scripts = moduleConfig.engine.dependencies;

                // save main start script
                composition.main = moduleConfig.main;

                // create a new module instance
                self.factory(composition, function (err, module_instance) {

                    // handle error
                    if (err) {
                        return callback(err);
                    }

                    // save module instance in cache
                    self._data[name] = module_instance;

                    // save the module instance always under the configured name
                    if (moduleConfig.name !== name) {
                        self._data[moduleConfig.name] = module_instance;
                    }

                    // return data
                    callback(null, module_instance);
                });
            });
        });
    }
};

/**
 * Parse and get the engine package infos.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {function} The callback function.
 */
function getPackackeInfo (module, callback) {
    var self = this;

    // check if it's a custom module
    if (typeof module === 'object') {
        return callback(null, module);
    }

    // create module path
    var path = engine.paths.app_modules + module + '/package.json';

    // return cached object
    if (self._modules[path]) {
        return callback(null, self._modules[path]);
    }

    // read and parse the packackage json file
    fs.readJson(path, function (err, packageInfo) {

        // handle errors
        if (err || !packageInfo || !packageInfo.engine) {
            return callback(err || new Error('No engine specific configs found.'));
        }

        // update file on change
        // TODO remove all module instance, when module changes
        if (self._data[path] !== null) {
            fs.watch(path, function (event) {

                // remove cached data on file change, to force reload
                if (event === 'change' && self._modules[path]) {

                    // remove the cached item
                    self._modules[path] = null;
                }
            });
        }

        // save package info in cache
        self._modules[path] = {
            main: packageInfo.main,
            engine: packageInfo.engine
        };

        // return the engine spezific package info
        callback(null, self._modules[path]);
    });
}

/**
 * Check the role access for a cache item.
 *
 * @private
 * @param {object} The cached item.
 * @param {string} The role name.
 */
function checkRoleAccess (item, role) {

    if (item.roles['*'] || (item.roles && item.roles[role])) {
        return true;
    }
}
