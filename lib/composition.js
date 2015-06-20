var File = require('./file');
var Cache = require('./cache');
var Module = require('./module');
var utils = require('./client/utils');

var composition_cache = Cache('compositions');

/**
 * Get module instance composition.
 */
module.exports = function (name, role, callback) {
  
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
        
        Module(config.module, function (err, modulePackage) {
            
            // handle module package error
            if (err) {
                return callback(err);
            }
            
            // merge package data into config
            if (modulePackage.engine_instance) {
                config = mergePackage(modulePackage.version, modulePackage.engine_instance, config);
            }
            
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
    
    // set composition name as custom module name
    if (typeof config.module === 'object' && !config.module.name) {
        config.module.name = config.name;
    }
}

function mergePackage (version, package_instance, config) {
  
    // merge client related options
    if (package_instance.client) {
        
        // ensure client config object
        config.client = config.client || {};
        config.client.name = config.name;
        config.client.version = version;
        
        // set client module scripts
        if (package_instance.client.module) {
            config.client.module = package_instance.client.module;
        }
        
        // config
        if (package_instance.client.config) {
            for (var key in package_instance.client.config) {
                if (typeof config.client.config[key] === 'undefined') {
                    config.client.config[key] = package_instance.client.config[key];
                }
            }
        }
        
        // flow
        if (package_instance.client.flow) {
            config.client.flow = (config.client.flow || []).concat(package_instance.client.flow);
        }
        
        // markup
        if (package_instance.client.markup) {
            config.client.markup = (config.client.markup || []).concat(package_instance.client.markup);
        }
        
        // styles
        if (package_instance.client.styles) {
            config.client.styles = (config.client.styles || []).concat(package_instance.client.styles);
        }
    }
    
    // server flow
    if (package_instance.flow) {
        config.flow = (config.flow || []).concat(package_instance.flow);
    }
    
    // merge server config
    if (package_instance.config) {
        for (var prop in package_instance.config) {
            if (typeof config.config[prop] === 'undefined') {
                config.config[prop] = package_instance.config[prop];
            }
        }
    }
    
    return config;
}
