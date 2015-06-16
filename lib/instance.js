
var createModuleInstance = require('./composition');
var Flow = require('./client/flow');
var utils = require('./client/utils');
var Cache = require('./cache');

// TODO make instance cache global (engine)
var instance_cache = engine.instances = {};

/**
 * The module instance factory.
 *
 * @public
 * @param {object} The module instance composition.
 * @param {function} The callback function.
 */
exports.factory = function (composition) {
  
    // 1. check Cache
    // 2. get composition
    // 3. create module instance

    // create new module instance
    var module_instance = utils.clone(Flow);

    // save composition data on the module instance
    module_instance._name = composition.name;
    module_instance._roles = composition.roles || {};
    module_instance._client = composition.client || {};
    module_instance._config = composition.config || {};
    module_instance._links = {};

    // save all events, which are allowed, to be emitted from the ws server
    module_instance._access = {};

    // pass module name to client
    module_instance._client.module = composition.module;

    // pass module instance name to client
    module_instance._client.name = composition.name;

    // attach create link method to module instance
    module_instance.link = engine.link;

    // require the serverside module
    if (composition._server) {

        try {
            // require the module
            var require_module = require(composition._server);

            // extend module instance with module methods
            if (require_module) {
                for (var prop in require_module) {
                    module_instance[prop] = require_module[prop];
                }
            }

        } catch (err) {
            console.error('lib/module.js#84', err.toString());
            return err;
        }
    }

    // setup the event flow
    if (composition.flow) {

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

    // call the init function
    if (typeof module_instance.init === "function") {
        module_instance.init();
    }

    // emit module instances "ready" event
    module_instance.emit('ready');

    // return the module instance
    return module_instance;
};
