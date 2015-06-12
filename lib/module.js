var fs = require('fs-extra');
var watch = require("fwatcher");
var Cache = require('./cache');
var module_cache = Cache('modules');

/**
 * Parse and get the engine package infos.
 *
 * @private
 * @param {string} The module name or the custom module config object.
 * @param {function} The callback function.
 * @param {object} The package of the parent module.
 */
module.exports = function getModulePackage (module, callback, parentPackage, version) {

    var moduleName = module.name || module;

    // get module package info from cache
    var modulePackage = module_cache.get(moduleName + (version ? '@' + version : ''));

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
                module_cache.set(_modulePackage._id, null);

                // set the top level packages also to null
                if (!parentPackage) {
                    module_cache.set(moduleName, null);
                }
            });
        }

        // save module base path
        _modulePackage._base = base;

        // call module handler with the parsed package.json
        handleModule(moduleName, _modulePackage, callback, parentPackage);
    });
};

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
    module_cache.set(modulePackage._id, modulePackage);

    // save the top level modules packages also und the module name
    if (!parentPackage) {
        module_cache.set(modulePackage.name, modulePackage);
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
    };
}
