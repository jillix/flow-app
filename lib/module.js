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
module.exports = function getModulePackage (module, callback, parentPackage) {
    
    // get cache key to look for cached packages
    var cachedPackage = module._id || module;
    
    // handle client dependency
    if (parentPackage) {
        
        // check if client dependency exists
        if (!parentPackage.dependencies[module]) {
            return callback(new Error('Client module dependency not found.'));
        }
        
        // update cache key with version
        cachedPackage += '@' + parentPackage.dependencies[module];
    }
    
    // return cached object
    if ((cachedPackage = module_cache.get(cachedPackage))) {
        return callback(null, cachedPackage);
    }

    // handle custom modules
    if (typeof module === 'object') {
        return handleModule(module, callback);
    }

    // create module path
    var base = (parentPackage ? parentPackage._base : engine.repo) + 'node_modules/' + module + '/';

    // read and parse the packackage json file
    File.json(base + 'package.json', function (err, modulePackage) {

        // handle error
        if (err) {
            return callback(err);
        }
        
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
    
    // check if client config exists
    var client = modulePackage.engine_instance;
    if (
      !client ||
      !client.client ||
      (
          !client.client.dependencies &&
          !client.client.module &&
          !client.client.markup &&
          !client.client.styles
      )
    ) {
        return callback(null, modulePackage);
    }
    client = client.client;
    
    var countDown = 1;
    var recursiveHandler = function (err, modPkg) {
            
        // TODO handle error
        // TODO merge modPkg files to modulePackage
        
        // save package info in cache
        module_cache.set(modPkg._id, modPkg);
        
        if (--countDown === 0) {
            
            // save the top level modules packages also without a version
            if (!parentPackage && modPkg.version !== 'custom') {
                module_cache.set(modPkg.name, modPkg);
            }
          
            callback(null, modulePackage);
        }
    };
    
    // handle client dependencies   
    if (client.dependencies) {
        
        countDown += client.dependencies.length;
      
        for (var i = 0, l = client.dependencies.length; i < l; ++i) {
            getModulePackage(
                client.dependencies[i],
                recursiveHandler,
                modulePackage
            );
        }
    }
    
    // prepare files
    if (client.module || client.markup || client.styles) {
        File.prepare(client, function (err, files) {
          
            // TODO update file path on module package
            
            recursiveHandler(null, modulePackage);
        });
    }
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
