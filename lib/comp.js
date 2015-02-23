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
                    console.log('COMPOSITION CHANGE:', name);
                    // set cached instance to null
                    engine.instances.set(name, null, role);
                }
            });
        }

        // check if composition has a module
        if (!composition.module || (typeof composition.module === 'object' && !composition.module.name)) {

            err = new Error('Incomplete module data in composition.');
            console.error('lib/comp.js#64', err.toString());
            return callback(err);
        }

        // read package info
        getModulePackage(composition.module, function (err, modulePackage) {

            if (err) {
                console.error('lib/comp.js#73', err.toString());
                return callback(err);
            }

            // add fingerprint to module instance components
            updateComponentPaths(
                composition.client || {},
                {
                    parentDir: engine.paths.app_public,
                    markup: {
                        parentDir: engine.paths.app_markup,
                        noCompression: true
                    }
                },
                function (err, components) {

                    if (err) {
                        console.error('lib/comp.js#90', err.toString());
                        return callback(err);
                    }

                    // merge module components to module instnace
                    if (modulePackage.components) {

                        // only module can have scripts
                        if (modulePackage.components.scripts) {
                            components.scripts = modulePackage.components.scripts;
                        }

                        // push styles to module instance
                        if (modulePackage.components.styles) {

                            // ensure module instnace styles array
                            components.styles = components.styles || [];

                            for (var i = 0; i < modulePackage.components.styles.length; ++i) {
                                components.styles.push(modulePackage.components.styles[i]);
                            }
                        }

                        // push markup to module instance
                        if (modulePackage.components.markup) {

                            // ensure module instnace markup array
                            components.markup = components.markup || [];

                            for (var i = 0; i < modulePackage.components.markup.length; ++i) {
                                components.markup.push(modulePackage.components.markup[i]);
                            }
                        }
                    }

                    // save main start script
                    if (modulePackage.main) {
                        composition.main = modulePackage.main;
                    }

                    // save updated paths
                    composition.client = components;

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

                    console.log(composition);
                    console.log('-----------------------------------------------');
                    console.log(modulePackage.clientDependencies, modulePackage.components);

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
 */
function getModulePackage (module, callback) {

    var moduleName = module.name || module;

    // get module package info from cache
    var modulePackage = engine.modules.get(moduleName);

    // return cached object
    if (modulePackage) {
        return callback(null, modulePackage);
    }

    // handle custom modules
    if (typeof module === 'object') {
        return handleModule(moduleName, module, callback);
    }

    // create module path
    var path = engine.paths.app_modules + moduleName + '/package.json';

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
                    console.log('PACKAGE CHANGE:', moduleName);
                    // set the cached module to null
                    engine.modules.set(moduleName, null);
                }
            });
        }

        handleModule(moduleName, packageInfo, callback);
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
function handleModule (moduleName, modulePackage, callback) {

    // TODO handle client dependencies
    // TODO update component paths

    // all dependencies of the instance dependencies must be in this array!
    // while installing a module, save all dependencies in the module deps
    // dependencies: ['./file.js', 's/o/modA/v']
    // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
    // => to client: ['./file.js', 's/o/n/v/file.js']

    // return custom module package
    if (!modulePackage.components) {

        // save package info in cache
        engine.modules.set(moduleName, modulePackage);

        // return custom module
        return callback(null, modulePackage);
    }

    // add fingerprints to module resources
    updateComponentPaths(
        modulePackage.components,
        {
            parentDir: engine.paths.app_modules + moduleName + '/',
            scripts: {prependPath: moduleName},
            markup: {noCompression: true}
        },
        function (err, components) {

            if (err) {
                console.error('lib/comp.js#206', err.toString());
                return callback(err);
            }

            modulePackage.components = components;

            callback(null, modulePackage);
        }
    );
}

//get the module's package infos
function updateComponentPaths (components, options, callback) {

    var count = 0;
    var parentDir = options.parentDir;

    for (var type in components) {

        switch (type) {
            case 'scripts':
            case 'markup':
            case 'styles':
                break;
            default:
              continue;
        }

        ++count;

        // get parent dir
        parentDir = options[type] && options[type].parentDir ? options[type].parentDir : options.parentDir;

         // update paths
        engine.file.addFingerprints(parentDir, components[type], function (err, paths) {

            if (err) {
                console.error('lib/comp.js#238', err.toString());
                return callback(err);
            }

            if (--count === 0) {

                // create component
                callback(null, components);
            }
        }, options[type]);
    }

    if (count === 0) {
        callback(null, components);
    }
}
