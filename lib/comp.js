/**
 * The module instance cache.
 *
 * @class Cache
 */

// require deps
var fs = require('fs-extra');
var watch = require("fwatcher");

engine.modules = engine.pojo('modules');
engine.instances = engine.pojo('module_instances', true);

/**
 * Create a module instance from a composition file.
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
        var error = new Error('access denied.');
        console.error(error);
        return callback(error);
    }

    // create path to composition file
    var path =  engine.paths.app_composition + name + '.json';

    // read the composition json
    fs.readJson(path, function (err, composition) {

        // handle error and check role access
        if (err || !engine.roleAccess(composition, role)) {
            err = err || new Error('access denied.');
            console.error('lib/comp.js#44', err.toString());
            return callback(err);
        }

        // watch file
        if (module_instance !== null) {
            watch(path, function (err) {
                if (err) {
                    return console.error(err);
                }

                // remove cached data on file change, to force reload
                console.log('COMPOSITION CHANGE:', name);
                // set cached instance to null
                engine.instances.set(name, null, role);
            });
        }

        // check if composition has a module
        if (!composition.module || (typeof composition.module === 'object' && !composition.module.name)) {

            err = new Error('Incomplete module data in composition.');
            console.error('lib/comp.js#65', err.toString());
            return callback(err);
        }

        // read package info
        getModulePackage(composition.module, function (err, modulePackage) {

            if (err || !modulePackage) {
                err = err || new Error('No package found for module: ' + composition.module);
                console.error('lib/comp.js#73', err.toString());
                return callback(err);
            }

            // add fingerprint to module instance components
            engine.file.prepareComponents({components: composition.client || {}}, function (err, components) {

                    if (err) {
                        console.error('lib/comp.js#90', err.toString());
                        return callback(err);
                    }

                    // get the updated components
                    components = components.components;

                    // merge module components to module instnace
                    if (modulePackage.components) {

                        for (var type in modulePackage.components) {

                            // ensure component type array
                            components[type] = components[type] || [];

                            // push the module components to the module instance components
                            for (var i = 0; i < modulePackage.components[type].length; ++i) {
                                components[type].push(modulePackage.components[type][i]);
                            }
                        }
                    }

                    // update composition client
                    composition.client = components;

                    // indeicate to require the server side module
                    if (modulePackage.main) {
                        composition._server = modulePackage._base + modulePackage.main;
                    }

                    // create a new module instance
                    module_instance = engine.module.factory(composition);

                    // handle factory error
                    if (module_instance instanceof Error) {
                        console.error('lib/comp.js#122', module_instance.toString());
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
                }
            );
        });
    });
};

/**
 * Parse and get the engine package infos.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {function} The callback function.
 * @param {object} The package of the parent module.
 */
function getModulePackage (module, callback, parentPackage, version) {

    var moduleName = module.name || module;

    // get module package info from cache
    var modulePackage = engine.modules.get(moduleName + (version ? '@' + version : ''));

    // return cached object
    if (modulePackage) {
        return callback(null, modulePackage);
    }

    // handle custom modules
    if (typeof module === 'object') {

        // for custom modules the base path is the repo itself
        module._base = engine.repo;
        module._id = moduleName;

        // call module handler with custom package object
        return handleModule(moduleName, module, callback, parentPackage);
    }

    // create module path
    var base = (parentPackage ? parentPackage._base : engine.repo) + 'node_modules/' + moduleName + '/';
    var path = base + 'package.json';

    // read and parse the packackage json file
    fs.readJson(path, function (err, _modulePackage) {

        // handle errors
        if (err || !_modulePackage) {
            err = err || new Error('No module package found.');
            console.error('lib/comp.js#182', err.toString());
            return callback(err);
        }

        // ensure module id
        _modulePackage._id = _modulePackage._id || _modulePackage.name + '@' + _modulePackage.version;

        // update file on change
        if (modulePackage !== null) {
            watch(path, function (err) {
                if (err) {
                    return console.error(err);
                }

                // remove cached data on file change, to force reload
                console.log('PACKAGE CHANGE:', moduleName, 'TODO: remove the instances of the module from the cache');
                // set the cached module to null
                engine.modules.set(_modulePackage._id, null);

                // set the top level packages also to null
                if (!parentPackage) {
                    engine.modules.set(moduleName, null);
                }
            });
        }

        // save module base path
        _modulePackage._base = base;

        // call module handler with the parsed package.json
        handleModule(moduleName, _modulePackage, callback, parentPackage);
    });
}

/**
 * Update module component paths and load client dependencies.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {object} The package info.
 * @param {function} The callback function.
 * @param {object} The package of the parent module.
 */
function handleModule (moduleName, modulePackage, callback, parentPackage) {

    // create loading handler callback
    callback = loadHandler(parentPackage, callback);

    // get module client dependencies
    if (modulePackage.clientDependencies) {

        for (var i = 0, module, version; i < modulePackage.clientDependencies.length; ++i) {
            module = modulePackage.clientDependencies[i];
            version = modulePackage.dependencies[module];
            getModulePackage(module, callback, modulePackage, version);
        }
    }

    // save package info in cache
    engine.modules.set(modulePackage._id, modulePackage);

    // save the top level modules packages also und the module name
    if (!parentPackage) {
        engine.modules.set(modulePackage.name, modulePackage);
    }

    // return custom module package
    if (!modulePackage.components) {

        // return custom module
        return callback(null, modulePackage);
    }

    // add fingerprints to module resources
    engine.file.prepareComponents(modulePackage, function (err, components) {

        if (err) {
            console.error('lib/comp.js#245', err.toString());
            return callback(err);
        }

        callback(null, modulePackage);
    });

}

/**
 * Handle recursive module loading and merge child components to the parent
 * module package.
 *
 * @private
 * @param {object} The object with the source arrays.
 * @param {object} Options fot the fingerprint mehtod.
 * @param {function} The callback function.
 */
function loadHandler (parentPackage, callback) {

    parentPackage && (parentPackage._elmsToLoad = (parentPackage.clientDependencies || '').length + 1);

    return function (err, modulePackage) {

        if (err || !modulePackage) {
            err = err || new Error('No module package found.');
            console.error('lib/comp.js#274', err.toString());

        } else {

            // merge module components into parent module
            if (parentPackage && modulePackage.components) {

                for (var type in modulePackage.components) {

                    // ensure component type array
                    parentPackage.components[type] = parentPackage.components[type] || [];

                    // push the module components to the parent module components
                    for (var i = 0; i < modulePackage.components[type].length; ++i) {
                        parentPackage.components[type].push(modulePackage.components[type][i]);
                    }
                }
            }
        }

        // return the module packge for top level modules
        if (!parentPackage) {
            return callback(null, modulePackage);
        }

        // return pareent package, when all submodules are merged
        if (--parentPackage._elmsToLoad === 0) {
            callback(null, parentPackage);
        }
    }
}
