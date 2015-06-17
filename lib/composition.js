var File = require('./file');
var Cache = require('./cache');
var Module = require('./module');
var utils = require('./client/utils');

var composition_cache = Cache('compositions');

/**
 * Get module instance composition.
 */
module.exports = function getComposition (name, role, callback) {
  
    // get composition from cache
    var composition = composition_cache.get(name);
    switch (composition) {
      
        // handle invalid composition configuration
        case 'INVALID':
            return callback(new Error('Invalid composition "' + name + '".'));
        
        // handle cache hit
        case !undefined:
            
            // check access for cached item   
            if (!utils.roleAccess(composition, role)) {
                return callback(new Error('Access denied for composition "' + name + '"'));
            }
            
            // return if composition is complete
            if (!composition.LOAD) {
                return callback(null, composition);
            }
    }
  
    // read the composition json
    File.json(engine.paths.app_composition + name + '.json', function (err, config) {
        
        // handle error
        if ((err = err || checkComposition(name, role, config))) {
            return callback(err);
        }
        
        Module(config.module, function (err, npmPackage) {
            
            // handle module package error
            if (err) {
                return callback(err);
            }
            
            // merge package composition defaults
            mergePackageComponents(config, npmPackage.components);
            mergePackageFlow(config, npmPackage.flow, npmPackage.clientFlow);
            
            // save composition in cache
            composition_cache.set(name, config);
            
            // return composition config
            callback(null, config);
        });
    });
};

/**
 * Check composition config. 
 */
function checkComposition (name, role, config) {
    
    // handle not found
    if (!config) {
        return new Error('composition "' + name +'" not found.');
    }
    
    // check if composition has a module
    if (!config.module) {
        
        // save as invalid in cache
        composition_cache.set(name, 'INVALID');
        return new Error('No module info in composition "' + name + '".');
    }
    
    // check access
    if (!utils.roleAccess(config, role)) {
        
        // save access information in cache, to check access without loading the hole file again
        composition_cache.set(name, {roles: config.roles, LOAD: true});
        return new Error('Access denied: Role "' + role + '", Composition "' + name + '".');
    }
    
    // set composition name in custom modules
    if (typeof config.module === 'object' && !config.module.name) {
        config.module.name = config.name;
    }
}

function mergePackageComponents (composition, components) {
    
}

function mergePackageFlow (composition, components) {
    
}

/**
 * Create a module instance from a composition file.
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 * @param {function} The callback function.
 */
function comp (name, role, callback) {

    // read the composition json
    fs.readJson(path, function (err, composition) {

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

                    // default module package flow configuration
                    modulePackage.flow = modulePackage.flow || [];
                    modulePackage.clientFlow = modulePackage.clientFlow || [];

                    // create the server flow
                    composition.flow = composition.flow || [];
                    composition.flow = composition.flow.concat(modulePackage.flow);

                    // create the client flow
                    composition.client.flow = composition.client.flow || [];
                    composition.client.flow = composition.client.flow.concat(modulePackage.clientFlow);

// --------------------------------------------------------

                    // create a new module instance
                    module_instance = Module(composition);

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
}
