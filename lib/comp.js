// require deps
var fs = require('fs-extra');
var fingerprint = require('./fingerprint');

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
            if (!engine.roleAccess(this._data[name], role)) {
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
            if (!engine.roleAccess(self._data[name], role)) {
                data = undefined;
                error = new Error('access denied.');
            }

            // return cached instance or call the callback
            error && console.error('lib/comp.js#102', error.toString());
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
            if (err || !engine.roleAccess(composition, role)) {
                err = err || new Error('access denied.');
                console.error('lib/comp.js#120', err.toString());
                return callback(err);
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

                if (err) {
                    console.error('lib/comp.js#141', err.toString());
                    return callback(err);
                }

                // extend module instance config with the module dependencies
                composition.client = composition.client || {};

                if (moduleConfig) {

                    // all dependencies of the instance dependencies must be in this array!
                    // while installing a module, save all dependencies in the module deps
                    // dependencies: ['./file.js', 's/o/modA/v']
                    // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
                    // => to client: ['./file.js', 's/o/n/v/file.js']
                    if (moduleConfig.clientLoad) {
                        composition.client.scripts = moduleConfig.clientLoad;
                    }

                    // save main start script
                    if (moduleConfig.main) {
                        composition.main = moduleConfig.main;
                    }
                }

                // create a new module instance
                self.factory(composition, function (err, module_instance) {

                    // handle error
                    if (err) {
                        console.error('lib/comp.js#170', err.toString());
                        return callback(err);
                    }

                    // save module instance in cache
                    self._data[name] = module_instance;

                    // save the module instance always under the configured name
                    if (composition.name !== name) {
                        self._data[composition.name] = module_instance;
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

    // handle custom modules
    // TODO cache custom modules
    if (typeof module === 'object') {

        // return custom module package
        if (!module.clientLoad) {
            return callback(null, module);
        }

        // add fingerprints to custom module dependencies
        fingerprint.addToFiles(module, module.clientLoad, function (err, scripts) {

            if (err) {
                console.error('lib/comp.js#213', err.toString());
                return callback(err);
            }

            // update the module dependencies with new script paths
            module.clientLoad = scripts;

            // return the custom module package
            callback(null, module);
        });

        return;
    }

    // return cached object
    if (self._modules[module]) {
        return callback(null, self._modules[module]);
    }

    // create module path
    var path = engine.paths.app_modules + module + '/package.json';

    // read and parse the packackage json file
    fs.readJson(path, function (err, packageInfo) {

        // handle errors
        if (err || !packageInfo) {
            err = err || new Error('No module package found.');
            console.error('lib/comp.js#241', err.toString());
            return callback(err);
        }

        // update file on change
        // TODO remove all module instance, when module changes
        if (self._data[module] !== null) {
            fs.watch(path, function (event) {

                // remove cached data on file change, to force reload
                if (event === 'change' && self._modules[module]) {

                    // remove the cached item
                    self._modules[module] = null;
                }
            });
        }

        // save package info in cache
        self._modules[module] = packageInfo;

        // return the engine spezific package info
        if (!packageInfo.clientLoad) {
            return callback(null, self._modules[module]);
        }

        // add fingerprints to client side dependencies
        fingerprint.addToFiles(module, packageInfo.clientLoad, function (err, scripts) {

            if (err) {
                console.error('lib/comp.js#271', err.toString());
                return callback(err);
            }

            // update the module dependencies with new script paths
            self._modules[module].clientLoad = scripts;

            // return the module package info
            callback(null, self._modules[module]);
        });
    });
}
