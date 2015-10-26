var Flow = require('./flow');
var utils = require('./utils');
var isPublicPath = new RegExp("^\/[^/]");
var markups = {};
var cbBuffer = {};
var instances = {};

function reset () {

    //reset caches
    instances = {};
    markups = {};
    cbBuffer = {};

    // reset DOM body
    document.body.innerHTML = '';

    // remove styles
    var styles = document.head.querySelectorAll('link[rel=stylesheet]');
    if (styles) {
        styles.forEach(function (stylesheet) {
            stylesheet.remove();
        });
    }
}

// call callbacks
function callbacks (err, instance, cbs) {
    cbs.forEach(function (callback) {
        callback(err, instance);
    });
}

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The CommonJS module.
 * @param {object} The composition config.
 * @param {function} Callback handler.
 */
module.exports = function factory (module, config, role, callback, loaderInstance) {

    // check instance cache
    if (instances[config.name]) {

        if (!utils.roleAccess(instances[config.name], role)) {
            return callback(console.log('E', new Error('Access denied for instance:' + config.name)));
        }

        // buffer callback
        if (instances[config.name] === 1 || !instances[config.name]._ready) {
            return cbBuffer[config.name].push(callback);
        }

        return callback(null, instances[config.name]);
    }

    // get composition
    // get module
    // get markup
    // load styles
    // create instance

    // save callback and mark instance as loading
    cbBuffer[config.name] = [callback];
    instances[config.name] = 1;

    // create new flow emitter
    var instance = Flow();
    var countDown = 1;
    var readyHandler = function (err) {
        if (--countDown === 0) {

            if (err) {
                callbacks(err, undefined, cbBuffer[config.name]);
                delete cbBuffer[config.name];
                delete instances[config.name];
                return;
            }

            // setup flow
            if (config.flow) {
                config.flow.forEach(function (flow) {
                    if (flow.constructor === Array) {

                        // create event streams cache
                        if (!instance._flow[flow[0]]) {
                            instance._flow[flow[0]] = []
                        }

                        // push flow stream config to stream cache
                        instance._flow[flow[0]].push(flow.slice(1));
                    }
                });
            }

            // don't init dependency instances
            if (loaderInstance) {

                // save not yet initialized instance in cache
                instances[config.name] = instance;
                return callback(null, instance);
            }

            initInstancesInLoadOrder(instance);
        }
    };

    // extend module instance with module properties
    if (module) {
        Object.keys(module).forEach(function (key) {
            instance[key] = module[key];
        });
    }

    // extend instance
    instance._module = config.module;
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._load = config.load;
    instance._flow = {};
    instance._markups = {};

    // collect dependency instance names in loader dependencies
    if (loaderInstance && config.load) {
        loaderInstance._load.concat(config.load);
    }

    // extend with logging methods
    instance.log = function () {};//require('./logs') ||

    // load styles
    config.styles && Flow.styles(config.styles);

    // load markup
    if (config.markup && config.markup.length) {
        ++countDown;
        Flow.markup(instance, config.markup, readyHandler);
    }

    // only client, on the server the module can just use require any file
    if (config.load) {
        countDown += config.load.length;
        config.load.forEach(function (childInstance) {
            Flow.load(childInstance, role, readyHandler, loaderInstance || instance);
        });
    }

    readyHandler();
};

/**
 * Setup event flow, emit ready events and after all module instances are ready, emit a route event.
 *
 * @public
 * @param {err} The err string.
 * @param {array} The loaded module instances.
 */
function initInstancesInLoadOrder (instance) {

    // init dependencies
    var dependencies = instance._load;
    if (dependencies) {

        // init instances
        dependencies.forEach(function (dependency) {

            if (!instances[dependency]) {
                return console.log('E', 'Instance "' + dependency + '" not found.');

            }

            if (instances[dependency].init) {
                instances[dependency].init();
            }

            instances[dependency]._ready = true;
            callbacks(null, instances[dependency], cbBuffer[dependency]);
        });
    }

    // init loader instance
    if (instance.init) {
        instance.init();
    }

    // save module instance in cache
    instances[instance._name] = instance;

    instance._ready = true;
    callbacks(null, instance, cbBuffer[instance._name]);
}
