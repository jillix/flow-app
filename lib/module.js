var File = require('./file');
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
    
    // append module prefix for custom modules
    var moduleName = typeof module === 'object' ? '_inst_mod:' + module.name : module;

    // get module package info from cache
    var cachedPackage = module_cache.get(moduleName + (version ? '@' + version : ''));

    // return cached object
    if (cachedPackage) {
        return callback(null, cachedPackage);
    }

    // handle custom modules
    if (typeof module === 'object') {

        // for custom modules the base path is the repo itself
        module._base = engine.repo;
        module.name = moduleName;
        module._id = moduleName;

        // call module handler with custom package object
        handleModule(module, callback, parentPackage);
        return;
    }

    // create module path
    var base = (parentPackage ? parentPackage._base : engine.repo) + 'node_modules/' + moduleName + '/';

    // read and parse the packackage json file
    File.json(base + 'package.json', function (err, modulePackage) {

        // handle error
        if (err) {
            return callback(err);
        }
        
        // handle module packet not found
        if (!modulePackage) {
            return callback(new Error('No module package found.'));
        }
        
        // TODO what if modulePackage.name !== moduleName ?

        // ensure module id
        modulePackage._id = modulePackage._id || modulePackage.name + '@' + modulePackage.version;
        
        // save module base path
        modulePackage._base = base;

        // call module handler with the parsed package.json
        handleModule(modulePackage, callback, parentPackage);
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
function handleModule (modulePackage, callback, parentPackage) {
    
    // save package info in cache
    module_cache.set(modulePackage._id, modulePackage);

    // save the top level modules packages also without a version
    if (!parentPackage) {
        module_cache.set(modulePackage.name, modulePackage);
    }
    
    
    
    // create loading handler callback for child modules
    if (parentPackage) {
        callback = loadHandler(parentPackage, callback);
    }

    // load module client dependencies
    if (modulePackage.clientDependencies) {
        for (var i = 0, l = modulePackage.clientDependencies.length; i < l; ++i) {
            getModulePackage(
                modulePackage.clientDependencies[i],
                callback,
                modulePackage,
                modulePackage.dependencies[module]
            );
        }
    }

    // return module package
    if (!modulePackage.components) {

        // return custom module
        return callback(null, modulePackage);
    }

    // add fingerprints to module resources
    File.prepareComponents(modulePackage, function (err, components) {

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
