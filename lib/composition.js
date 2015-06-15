/**
 * The module instance cache.
 *
 * @class Cache
 */

// require deps
var fs = require('fs-extra');
var watch = require("fwatcher");
var Cache = require('./cache');
var Module = require('./module');
var utils = require('./client/utils');

var composition_cache = Cache('compositions');

/**
 * Create a module instance from a composition file.
 *
 * @public
 * @param {string} The module instance name.
 * @param {string} The role name.
 * @param {function} The callback function.
 */
module.exports = function (name, role, callback) {

    var module_instance = engine.instances[name];
    
    // check if object is already in cache
    if (module_instance) {
        
        // check role access
        if (!utils.roleAccess(module_instance, role)) {
            var error = new Error('access denied.');
            console.error(error);
            return callback(error);
        }
        
        return callback(null, module_instance);
    }
    // create path to composition file
    var path =  engine.paths.app_composition + name + '.json';

    // read the composition json
    fs.readJson(path, function (err, composition) {

        // handle error and check role access
        if (err || !utils.roleAccess(composition, role)) {
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
        if (!composition.module) {

            err = new Error('No module info in composition.');
            console.error('lib/comp.js#65', err.toString());
            return callback(err);
        }

        // set composition name in custom modules
        if (typeof composition.module === 'object' && !composition.module.name) {
            composition.module.name = composition.name;
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
};
