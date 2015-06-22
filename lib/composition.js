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
    if (composition) {

        if (composition === 'INVALID') {
            return callback(new Error('Invalid composition "' + name + '".'));
        }

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
        
        // create mandatory package infos to custom module
        if (typeof config.module === 'object') {
            config.module.name = name;
            config.module.version = 'custom';
            config.module._id = name + '@custom';
            module._base = engine.repo;
        }
        
        Module(config.module, function (err, modulePackage) {
            
            // handle module package error
            if (err) {
                return callback(err);
            }
            
            // prepare instance components
            if (config.client && (config.client.styles || config.client.markup)) {
                
                // send module id and module base
                var components = {
                    base: modulePackage._base,
                    module: modulePackage._id,
                    styles: config.client.styles,
                    markup: config.client.markup
                };
                
                File.prepare(components, function (err, files) {
                    
                    // update file paths in module package
                    if (files.styles) {
                        config.client.styles = files.styles;
                    }
                    
                    if (files.markup) {
                        config.client.markup = files.markup;
                    }
                    
                    finish(name, modulePackage, config, callback);
                });
                return;
            }
            
            finish(name, modulePackage, config, callback);
        });
    });
};

function finish (name, modulePackage, config, callback) {
    
    // merge package data into config
    if (modulePackage.composition) {
        config = mergePackage(modulePackage.version, modulePackage.composition, config);
    }
    
    // save composition in cache
    composition_cache.set(name, config);
    
    // return composition config
    callback(null, config);
}

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

/**
 * Merge package config into composition config. 
 */
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
