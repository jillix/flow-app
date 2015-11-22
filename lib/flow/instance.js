var Flow = require('./flow');
var utils = require('./utils');
var isPublicPath = new RegExp("^\/[^/]");
var cbBuffer = {};
var instances = {};

// call callbacks
function callbacks (name, err, instance) {
    var cbs = cbBuffer[name];
    if (!cbs || !cbs.length) {
        return;
    }

    cbs.forEach(function (callback) {
        callback(err, instance);
    });
    if (err) {
        delete instances[name];
    }

    delete cbBuffer[name];
}

//reset caches
exports.reset = function () {
    instances = {};
    cbBuffer = {};
};

exports.instances = instances;

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The CommonJS module.
 * @param {object} The composition config.
 * @param {function} Callback handler.
 */
exports.factory = function (name, session,  callback) {

    if (!name) {
        return callback(new Error('Instance.factory: No name.'));
    }

    process.nextTick(_factory.bind(this), name, session, callback);
};

function _factory (name, session, callback) {

    session = session || {};
    callback = callback || function (err) {err && console.error(err)};

    // check instance cache
    if (name !== '*' && instances[name]) {

        // buffer callback
        if (instances[name] === 1 || !instances[name]._ready) {
            return cbBuffer[name].push(callback);
        }

        if (!utils.access(instances[name], session)) {
            return callback(console.log('E', new Error('Access denied for instance:' + name)));
        }

        return callback(null, instances[name]);
    }

    // save callback and mark instance as loading
    cbBuffer[name] = [callback];
    instances[name] = 1;

    var flow = this;

    // get composition
    flow.composition(name, function (err, composition) {

        if (err) {
            // TODO call callbacls
            return callbacks(name, err, null);
        }

        if (!composition || !composition.module) {
            return callbacks(name, new Error('Invalid composition'));
        }

        if (!utils.access(composition, session)) {
            return callbacks(name, new Error('Access denied for instance:' + composition.name));
        }

        // load styles
        if (flow.styles && composition.styles) {
            flow.styles(composition.styles);
        }

        // pre load instances
        if (composition.load) {
            composition.load.forEach(function (iName) {
                flow.load(iName);
            });
        }

        var count = 1;
        var module;
        var markup;
        var readHandler = function (err, data, isMarkup) {

            if (err) {
                return callbacks(name, err);
            }

            if (isMarkup) {
                markup = data;
            } else {
                module = data;
            }

            if (--count === 0) {
                build.call(flow, module, markup, composition, callback, (name === '*'));
            }
        };

        // load markup
        if (flow.markup && composition.markup) {
            ++count;
            flow.markup(composition.markup, readHandler);
        }

        // get CommonJS module
        flow.module(composition.module, readHandler);
    });
};

function build (module, markup, config, callback, isEntrypoint) {

    // create new flow emitter
    var flow = this;
    var instance = flow.factory(module);

    // extend instance
    instance._module = config.module;
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._flow = config.flow;
    instance._markups = markup;
    instance._events = {};

    var ready = function (err, data) {

        if (err) {
            return callbacks(isEntrypoint ? '*': instance._name, err);
        }

        // mark instance as ready
        instance._ready = true;

        // save module instance in cache
        instances[instance._name] = instance;

        if (isEntrypoint) {
            instances['*'] = instance;
        }

        if (config.flow.ready) {
            var event = instance.flow('ready');
            event.on('error', console.error);
            event.end(data || true);
        }

        callbacks(isEntrypoint ? '*': instance._name, null, instance);
    };

    // init loader instance
    instance.init ? instance.init(config.config || {}, ready) : ready();
}
