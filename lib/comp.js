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
 * Create a module instance.
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 * @param {function} The callback function.
 */
module.exports = function (name, role, callback) {
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

        var count = 0;

        // update client resources paths
        if (composition.client) {

            // update css paths with fingerprints
            if (composition.client.css) {

                ++count;

                // update paths
                engine.file.addFingerprints(engine.paths.app_public, composition.client.css, function (err, paths) {

                    if (err) {
                        console.error('lib/comp.js#72', err.toString());
                        return callback(err);
                    }

                    if (--count === 0) {

                        // create component
                        factoryModuleInstance(name, composition, module_instance, callback);
                    }
                });
            }

            // TODO update html paths if html is loaded with link import (webcomponents)
            /*if (composition.client.html) {

                ++count;

                engine.file.addFingerprints(engine.paths.app_markup, composition.client.html, function (err, paths) {

                    if (err) {
                        console.error('lib/comp.js#96', err.toString());
                        return callback(err);
                    }

                    // composition.client.html = paths;

                    if (--count === 0) {

                        // create component
                        factoryModuleInstance(name, composition, module_instance, callback);
                    }
                }, {noCompression: true});
            }*/
        }

        if (count === 0) {
            factoryModuleInstance(name, composition, module_instance, callback);
        }
    });
};

//get the module's package infos
function factoryModuleInstance (name, composition, module_instance, callback) {

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
        module_instance = engine.module.factory(composition);

        // handle factory error
        if (module_instance instanceof Error) {
            console.error('lib/comp.js#170', module_instance.toString());
            return callback(module_instance);
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
}

/**
 * Parse and get the engine package infos.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {function} The callback function.
 */
function getPackackeInfo (module, callback) {

    // handle custom modules
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

        return handleModule(module.name, module, callback);
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

        handleModule(module, packageInfo, callback);
    });
}

/**
 * Add fingerprints to client load scripts.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {object} The package info.
 * @param {function} The callback function.
 */
function handleModule (module, packageInfo, callback) {

    // return custom module package
    if (!packageInfo.clientLoad) {

        // save package info in cache
        engine.modules.set(module, packageInfo);

        // return custom module
        return callback(null, module);
    }

    // add fingerprints to custom module dependencies
    engine.file.addFingerprints(engine.paths.app_modules + module + '/', packageInfo.clientLoad, function (err, scripts) {

        if (err) {
            console.error('lib/comp.js#213', err.toString());
            return callback(err);
        }

        // update the module dependencies with new script paths
        packageInfo.clientLoad = scripts;

        // save package info in cache
        engine.modules.set(module, packageInfo);

        // return the custom module package
        callback(null, packageInfo);
    }, {
        prependPath: module
    });
}
