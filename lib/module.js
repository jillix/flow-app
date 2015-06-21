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
module.exports = function getModulePackage (module, callback, version, base) {
    
    // get cache key to look for cached packages
    var cachedPackage = module._id || module + (version ? '@' + version : '');
    
    // return cached object
    if ((cachedPackage = module_cache.get(cachedPackage))) {
        return callback(null, cachedPackage);
    }

    // handle custom modules
    if (typeof module === 'object') {
        return handleModule(module, callback, true);
    }

    // update base path
    base = (base || engine.repo) + 'node_modules/' + module + '/';

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
        handleModule(modulePackage, callback, version ? false : true);
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
function handleModule (modulePackage, callback, top) {
    
    // check if client config exists
    var client = modulePackage.composition;
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
        saveInCache(modulePackage, top);
        return callback(null, modulePackage);
    }
    client = client.client;
    
    var callback_count = 0;
    
    // handle client dependencies   
    if (client.dependencies) {
        
        ++callback_count;
        
        var countDown = client.dependencies.length;
        var recursiveHandler = function (err, modPkg) {
                
            // handle error
            if (err) {
                if (--countDown === 0) {
                    callback(err);
                }
                return;
            }
            
            // merge modPkg files to modulePackage
            if (modPkg.composition && modPkg.composition.client) {
                
                if (modPkg.composition.client.module) {
                    client.module = client.module || [];
                    client.module.concat(modPkg.composition.client.module);
                }
                
                if (modPkg.composition.client.styles) {
                    client.styles = styles || [];
                    client.styles.concat(modPkg.composition.client.styles);
                }
                
                if (modPkg.composition.client.markup) {
                    client.markup = client.markup || [];
                    client.markup.concat(modPkg.composition.client.markup);
                }
            }
            
            if (--countDown === 0 && --callback_count === 0) {
                saveInCache(modulePackage, top);
                callback(null, modulePackage);
            }
        };
      
        for (var i = 0, l = client.dependencies.length; i < l; ++i) {
            
            // check if client dependency exists
            if (!modulePackage.dependencies[client.dependencies[i]]) {
                return recursiveHandler(new Error('Client module dependency not found.'));
            }
            
            // merge client packages
            getModulePackage(
                client.dependencies[i],
                recursiveHandler,
                modulePackage.dependencies[client.dependencies[i]],
                modulePackage._base
            );
        }
    }
    
    // prepare files
    if (client.module || client.markup || client.styles) {
        
        ++callback_count;
        
        File.prepare(client, function (err, files) {

            if (err) {
                return callback(err);
            }
  
            // update file paths in module package
            if (files.module) {
                client.module = files.module;
            }
            
            if (files.styles) {
                client.styles = files.styles;
            }
            
            if (files.markup) {
                client.markup = files.markup;
            }
            
            if (--callback_count === 0) {
                saveInCache(modulePackage, top);
                callback(null, modulePackage);
            }
        });
    }
}

function saveInCache (module, top) {
    
    // save package info in cache
    module_cache.set(module._id, module);
    
    // save the top level modules also without a version
    if (top && module.version !== 'custom') {
        module_cache.set(module.name, module);
    }
}
