// nodejs event emitter
var EventEmitter = require('events').EventEmitter;

// get fingerprint module
var fingerprint = require('./fingerprint');

// create a composition cache
var moduleInstanceCache = engine.cache.comp('moduleInstances', factory);

// module instance cache
engine.modules = {};

// listen to the core load module instance configuration event
engine.on('load', load);

// export check access method
exports.eventAccess = checkEventAccess;

/**
 * Check if role has access to instance and event.
 *
 * @public
 * @param {string} The role name.
 * @param {string} The module instance name.
 * @param {string} The event name.
 */
function checkEventAccess (role, module_instance, event) {

    // get instance with role check
    module_instance = moduleInstanceCache.get(module_instance, role);

    // check if this instance has acces to the requested operation
    if (module_instance &&  module_instance._access && module_instance._access[event]) {
        return instance;
    }

    return;
}

/**
 * The module instance factory.
 *
 * @public
 * @param {object} The module instance composition.
 * @param {function} The callback function.
 */
function factory (composition, callback) {

    // create new module instance
    var module_instance = new EventEmitter();

    // save composition data on the module instance
    module_instance._name = composition.name;
    module_instance._roles = composition.roles || {};
    module_instance._client = composition.client || {};
    module_instance._config = composition.config || {};

    // pass module name to client
    module_instance._client.module = composition.module;

    // pass module instance name to client
    module_instance._client.name = composition.name;

    // attach create link method to module instance
    module_instance.link = engine.link;

    // require the serverside module
    if (composition.main) {

        try {
            // get absolute path from the repo and relative path from the module
            var path = composition.main === '/' ? engine.repo : engine.paths.app_modules + composition.module + '/';
            var require_module = require(path + composition.main);

            // extend module instance with module methods
            if (require_module) {
                for (var prop in require_module) {
                    module_instance[prop] = require_module[prop];
                }
            }

        } catch (err) {
            return callback(err);
        }
    }

    // setup the event flow
    if (composition.flow) {

        // save all events, which are allowed, to be emitted from the ws server
        module_instance._access = {};

        // loop through all listeners
        for (var i = 0, listen; i < composition.flow.length; ++i) {
            listen = composition.flow[i];

            // update event access
            module_instance._access[listen['in']] = true;

            // listen to events
            module_instance[listen['1'] ? 'once' : 'on'](
                listen['in'],

                // create an event handler
                engine.flow(module_instance, listen.out)
            );
        }
    }

    // add fingerprints to css files
    if (composition.client.css) {
        fingerprint.addToFiles(composition.module, composition.client.css, function (err, files) {

            if (err) {
                return callback(err);
            }

            // update client css files
            module_instance._client.css = files;

            // emit module instances "ready" event
            module_instance.emit('ready');

            // return the module instance
            callback(null, module_instance);
        });

        return;
    }

    // emit module instances "ready" event
    module_instance.emit('ready');

    // return the module instance
    callback(null, module_instance);
}

/**
 * Load an module instance over websoockets.
 *
 * @public
 * @param {object} The link object.
 */
function load (link) {
    var self = this;

    // receive data
    link.data(function (err, module_instance_name) {

        // load entrypoint module instance with hostname
        if (!module_instance_name) {

            module_instance_name = link.socket.upgradeReq.headers.host.split(':')[0].replace(/\./g, '_');

            // get the public version of the entrypoint module instance
            if (!link.role) {
                module_instance_name += '.pub';
            }
        }

        // get the module instance
        moduleInstanceCache.get(module_instance_name, link.role, function (err, module_instance) {

            // handle error
            if (err || !module_instance) {
                return link.end('Module instance "' + module_instance_name + '" ' + err || 'not found.');
            }

            // end link and send data
            link.end(null, module_instance._client);
        });
    });
}
