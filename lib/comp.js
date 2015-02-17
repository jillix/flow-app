/**
 * The module instance cache.
 *
 * @class Cache
 */

// require deps
var fs = require('fs-extra');

engine.modules = engine.pojo('modules');
engine.instances = engine.pojo('module_instances', true);

/**
 * Remove a module instance or empty cache.
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 */
exports.remove = function (name, role) {

    // remove one item
    if (name) {

        // remove cache object
        return engine.instances.rm(name, role);
    }

    // remove all module instances from cache
    engine.rm();
};

/**
 * Get a module instance with role check
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 */
exports.get = function (name, role) {

    if (name) {

        // return cache object
        return engine.instances.get(name, role);
    }
};

/**
 * Create a module instance.
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 * @param {function} The callback function.
 */
exports.create = function (name, role, callback) {
    var module_instance = engine.instances.get(name, role);

    // check if object is already in cache
    if (module_instance) {
        return callback(null, module_instance);
    }

    // handle access denied
    if (module_instance === 0) {
        return callback(new Error('access denied.'));
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
        if (module_instance !== null) {
            fs.watch(path, function (event) {

                // remove cached data on file change, to force reload
                if (event === 'change') {

                    // remove the cached item
                    engine.instances.set(name, null, role);
                }
            });
        }

        // TOOD update css and html paths with fingerprints
        if (composition.client && composition.client.css) {
            // TODO update paths
            //engine.file.addFingerprints(composition.module, composition.client.css, function (err, paths) {});
        }

        // TODO update html paths if html is loaded with link import (webcomponents)
        //if (composition.client && composition.client.html) {
        //    engine.file.addFingerprints(composition.module, composition.client.html, function (err, paths) {});
        //}

        // get the module's package infos
        getPackackeInfo(composition.module, function (err, moduleConfig) {

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
            engine.module.factory(composition, function (err, module_instance) {

                // handle error
                if (err) {
                    console.error('lib/comp.js#170', err.toString());
                    return callback(err);
                }

                // save module instance in cache
                engine.instances.set(name, module_instance);

                // save the module instance always under the configured name
                if (composition.name !== name) {
                    engine.instances.set(composition.name, module_instance);
                }

                // return data
                callback(null, module_instance);
            });
        });
    });
};

/**
 * Parse and get the engine package infos.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {function} The callback function.
 */
function getPackackeInfo (module, callback) {

    // handle custom modules
    // TODO cache custom modules
    if (typeof module === 'object') {

        if (!module.name) {
            var error = new Error('No module name.');
            console.error('lib/comp.js#176', error.toString());
            return callback(error);
        }

        // get module package info from cache
        var modulePackage = engine.modules.get(module.name);

        // return cached object
        if (modulePackage) {
            return callback(null, modulePackage);
        }

        // return custom module package
        if (!module.clientLoad) {

            // save package info in cache
            engine.modules.set(module.name, module);

            // return custom module
            return callback(null, module);
        }

        // add fingerprints to custom module dependencies
        engine.file.addFingerprints(module, module.clientLoad, function (err, scripts) {

            if (err) {
                console.error('lib/comp.js#213', err.toString());
                return callback(err);
            }

            // update the module dependencies with new script paths
            module.clientLoad = scripts;

            // save package info in cache
            engine.modules.set(module.name, module);

            // return the custom module package
            callback(null, module);
        });

        return;
    }

    // get module package info from cache
    var modulePackage = engine.modules.get(module);

    // return cached object
    if (modulePackage) {
        return callback(null, modulePackage);
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
        if (modulePackage !== null) {
            fs.watch(path, function (event) {

                // remove cached data on file change, to force reload
                if (event === 'change') {

                    // set the cached module to null
                    engine.modules.set(module, null);
                }
            });
        }

        // return the engine spezific package info
        if (!packageInfo.clientLoad) {

            // save package info in cache
            engine.modules.set(module, packageInfo);

            return callback(null, packageInfo);
        }

        // add fingerprints to client side dependencies
        engine.file.addFingerprints(module, packageInfo.clientLoad, function (err, scripts) {

            if (err) {
                console.error('lib/comp.js#271', err.toString());
                return callback(err);
            }

            // update the module dependencies with new script paths
            packageInfo.clientLoad = scripts;

            // save package info in cache
            engine.modules.set(module, packageInfo);

            // return the module package info
            callback(null, packageInfo);
        });
    });
}
