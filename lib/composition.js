var Cache = require('./cache');

var composition_cache = Cache('compositions');

var cbBuffer = {};

/**
 * Get module instance composition.
 */
module.exports = function (name, related, role, callback) {

    // get composition from cache
    /*var path = engine.paths.app_composition + name + '.json';
    var composition = composition_cache.get(path);
    if (composition) {

        if (composition === 'INVALID') {
            return utils.nextTick(callback, engine.log('E', new Error('Invalid composition "' + name + '".')));
        }

        // check access for cached item
        if (!utils.roleAccess(composition, role)) {
            return utils.nextTick(callback, engine.log('E', new Error('Access denied for composition "' + name + '"')));
        }

        // add related instances to composition and update cache
        if (related) {
            composition = File.relate(related, composition);
            composition_cache.set(path, composition);
        }

        return utils.nextTick(callback, null, composition);
    }

    cbBuffer[path] = cbBuffer[path] || [];

    // buffer callback if file is loading
    if (composition === null) {
        cbBuffer[path].push(callback);
        return;
    }

    // set file loading mode
    composition_cache.set(path, null);
    cbBuffer[path].push(callback);

    // read the composition json
    File.json(path, function (err, config) {

        // handle error
        if ((err = err || checkComposition(name, path, role, config))) {
            composition_cache.set(path, 'INVALID');
            return callbacks(path, err);
        }

        // ensure name
        config.name = config.name || name;

        // ensure related config object
        related = related || {};
        related.compositions = related.compositions || {};

        // handle aliases for entrypoints
        if (config.name !== name) {
            config._cache_alias = engine.paths.app_composition + config.name + '.json';
            related.instances[config.name] = true;
            related.compositions[config._cache_alias] = true;
        }

        // create mandatory package infos to custom module
        if (typeof config.module === 'object') {
            config.module = {composition: config.module};
            config.module.name = name;
            config.module.version = 'custom';
            config.module._id = name + '@custom';
            config.module._base = engine.repo;

            // move main out of the composition config
            if (config.module.composition.main) {
                config.module.main = config.module.composition.main;
                delete config.module.composition.main;
            }

            // remove custom module on composition file change
            related.modules = related.modules || {};
            related.modules[config.module._id] = true;
        }

        // merge related items to update cache on item change
        config = File.relate(related, config);

        // add composition to related items
        related.compositions[path] = true;

        Module(config.module, related, function (err, modulePackage) {

            // handle module package error
            if (err) {
                composition_cache.set(path, 'INVALID');
                return callbacks(path, err);
            }

            // set packages server main in composition, to require server side module
            if (modulePackage.main) {
                config._main = modulePackage.main;
            }

            // prepare instance components
            if (config.client && (config.client.styles || config.client.markup)) {

                // send module id and module base
                var components = {
                    base: modulePackage._base,
                    module: modulePackage._id,
                    styles: config.client.styles,
                    markup: config.client.markup,
                    related: related
                };

                File.prepare(components, function (err, files) {

                    if (err) {
                        composition_cache.set(path, 'INVALID');
                        return callbacks(path, err);
                    }

                    // update file paths in module package
                    if (files.styles) {
                        config.client.styles = files.styles;
                    }

                    if (files.markup) {
                        config.client.markup = files.markup;
                    }

                    finish(name, path, modulePackage, config);
                });
                return;
            }

            finish(name, path, modulePackage, config);
        });
    }, 'compositions');
    */
};

function finish (name, path, modulePackage, config) {

    // merge package data into config
    if (modulePackage.composition) {
        config = mergePackage(modulePackage.version, modulePackage.composition, config);
    }

    // save composition in cache
    composition_cache.set(path, config);

    // return composition config
    // TODO return the module require(modulePackage._main)
    callbacks(path, null, config);
}

function callbacks (path, err, data) {
    if (cbBuffer[path]) {
        for (var i = 0; i < cbBuffer[path].length; i++) {
            cbBuffer[path][i](err, data);
        }

        delete cbBuffer[path];
    }
}

/**
 * Check composition config.
 */
function checkComposition (name, path, role, config) {

    // handle not found
    if (!config) {
        return engine.log('E', new Error('composition "' + name +'" not found.'));
    }

    // check access
    /*if (!utils.roleAccess(config, role)) {

        // save access information in cache, to check access without loading the hole file again
        composition_cache.set(path, {roles: config.roles, LOAD: true});
        return engine.log('E', new Error('Access denied: Role "' + role + '", Composition "' + name + '".'));
    }*/

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
        if (package_instance.client.flow && package_instance.client.flow.length) {
            config.client.flow = (config.client.flow || []).concat(package_instance.client.flow);
        }

        // markup
        if (package_instance.client.markup && package_instance.client.markup.length) {
            config.client.markup = (config.client.markup || []).concat(package_instance.client.markup);
        }

        // styles
        if (package_instance.client.styles) {
            config.client.styles = (config.client.styles || []).concat(package_instance.client.styles);
        }

        // clean up client flow config
        if (config.client.flow && !config.client.flow.length) {
            delete config.client.flow;
        }

        // clean up client markup flow config
        if (config.client.markup && !config.client.markup.length) {
            delete config.client.markup;
        }

        // clean up client styles config
        if (config.client.styles && !config.client.styles.length) {
            delete config.client.styles;
        }
    }

    // server flow
    if (package_instance.flow) {
        config.flow = (config.flow || []).concat(package_instance.flow);
    }

    // clean up client flow config
    if (config.flow && !config.flow.length) {
        delete config.flow;
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
