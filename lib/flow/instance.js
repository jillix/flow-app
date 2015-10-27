var Flow = require('./flow');
var utils = require('./utils');
var isPublicPath = new RegExp("^\/[^/]");
var cbBuffer = {};
var instances = {};

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
module.exports = function (name, callback) {

    callback = callback || function () {};

    // check instance cache
    if (instances[name]) {

        if (!utils.roleAccess(instances[name], role)) {
            return callback(console.log('E', new Error('Access denied for instance:' + name)));
        }

        // buffer callback
        if (instances[name] === 1 || !instances[name]._ready) {
            return cbBuffer[name].push(callback);
        }

        return callback(null, instances[config.name]);
    }

    // save callback and mark instance as loading
    cbBuffer[name] = [callback];
    instances[name] = 1;

    var flow = this;

    // get composition
    flow.composition(name, function (err, composition) {

        if (err) {
            return callback(err);
        }

        // load styles
        composition.styles && flow.styles(composition.styles);

        // pre load instances
        if (composition.load) {
            composition.load.forEach(function (iName) {
                flow.load(iName);
            });
        }

        var count = 1;
        var module;
        var readHandler = function (err, cjsMod) {

            module = module || cjsMod;

            if (--count === 0) {
                build.call(flow, module, composition, callback);
            }
        };

        // load markup
        if (composition.markup) {
            ++count;
            flow.markup(composition.markup, readHandler);
        }

        // get CommonJS module
        flow.module(composition.module, readHandler);
    });
};

function build (module, config, callback) {

    // create new flow emitter
    var flow = this;
    var instance = flow.factory(module);

    // extend instance
    instance._module = config.module;
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._flow = {};
    instance._markups = {};

    // setup flow
    if (config.flow) {
        config.flow.forEach(function (flow) {
            if (flow.constructor === Array) {

                // create event streams cache
                if (!instance._flow[flow[0]]) {
                    instance._flow[flow[0]] = [];
                }

                // push flow stream config to stream cache
                instance._flow[flow[0]].push(flow.slice(1));
            }
        });
    }

    // init loader instance
    if (instance.init) {
        instance.init();
    }

    // mark instance as ready
    instance._ready = true;

    // save module instance in cache
    instances[instance._name] = instance;
    callbacks(null, instance, cbBuffer[instance._name]);
}
