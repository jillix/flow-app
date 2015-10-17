var Stream = require('./stream');
var Socket = require('./socket');
var transform = require('./transform');
var utils = require('./utils');

// flow factory
module.exports = function (emitter) {

    // merge flow emitter to existing object
    if (emitter) {
        Object.keys(FlowEmitter).forEach(function (key) {
            emitter[key] = FlowEmitter[key];
        });

    // create a new emitter
    } else {
        emitter = utils.clone(FlowEmitter);
    }

    emitter._flow = emitter._flow || {};
    return emitter;
};

var FlowEmitter = {

    /**
     * Call flow handlers which listen to event.
     *
     * @public
     * @param {Object} stream The stream object.
     * @param {Object} options Method options.
     * @param {String} options.emit The event name to emit.
     * @param {Boolean} options.noCache Indicate not to use the stream cache.
     */
    flow: function (stream, options) {

        // handle arguments
        var eventName;
        var noCache;

        // special case for the flow method, cause this method
        // can be called from the code `this.flow('event', true)`
        if (typeof stream === 'string') {
            noCache = options;
            eventName = stream;
            stream = undefined;
        } else if (typeof options === 'object') {
            eventName = options.emit;
            noCache = options.noCache;
        }

        // return if event name is missing
        if (!eventName) {
            return this.log('E', new Error('Flow call without event name.'));
        }

// custom events (eventName is a flow config) - not cached
// - create new stream with provided config

// existing instance flow events (this._flow) - cached
// - return cached stream
// - create stream if not cached
// - cache the stream (streams.instanceName.eventName: [[flow]])

// check stream cache
//if (this._streams[eventName]) {}

        // call event on server
        if (stream && eventName[0] === '@') {
            stream._broken = true;
            return Socket.stream(stream, eventName.substr(1));
        }

        var events = this._flow;

        // create stream
        stream = Stream(this, stream, noCache ? null : eventName);

        // return on cached stream
        if (stream[0]) {
            return stream[0];
        }

        stream.pause();
        stream._events = 0;

        // setup event stream directly if eventName is an object
        if (typeof eventName === 'object') {
            ++stream._events;
            utils.nextTick(Flow, this, stream, eventName, stream);
            return stream;
        }

        // check if event exists
        if (events[eventName] && events[eventName].length) {

            // index for events that must be removed
            var obsoleteEvents = [];
            var i, l;
            var config;

            // call handlers
            for (i = 0, l = events[eventName].length; i < l; ++i) {
                if ((config = events[eventName][i])) {

                    ++stream._events;

                    // pass stream to flow to setup handlers
                    utils.nextTick(Flow, this, stream, config, stream);

                    // remove from event buffer, if once is true
                    if (config[0] instanceof Array) {
                        config = null;
                    }
                }
            }
        }

        // return transmitter to send and receive data
        return stream;
    },

    ALTR: transform,
    BUFR: function () {},

    /**
     * Empties all caches and reloads the modules.
     *
     * @public
     */
    ERES: function () {

        for (var i = 0, l = engine._r.length; i < l; ++i) {
            engine._r[i]();
        }

        return engine.load();
    }
};

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
function Flow (instance, stream, config, flowStream, count) {

    // handle first call
    if (typeof count !== 'number') {
        count = -1;

        // create new stream for every listener
        stream = Stream(instance, stream).pause();
    }

    // get flow config
    var method = config[++count];
    var last = config[count + 1] ? false : true;

    // resume stream and return
    if (!method) {

        if (!--flowStream._events) {
            flowStream.resume();
        }

        return stream.resume();
    }

    method = parseConfig(method, instance);

    var session = stream.context ? stream.context.session : {};
    var role = (session || {})[engine.session_role];

    // load module instance
    if (typeof method.i === 'string') {

        // load instance
        return engine.load(method.i, role, function (err, method_instance) {

            if (err) {
                return Flow(instance, stream, config, flowStream, count);
            }

            method.i = method_instance;
            callStreamHandler(stream, method, session, role, last);

            Flow(instance, stream, config, flowStream, count);
        });
    }

    callStreamHandler(stream, method, session, role, last);
    Flow(instance, stream, config, flowStream, count);
}

function callStreamHandler (stream, method, session, role, last) {

    // check access
    // TODO check event access
    if (session && !utils.roleAccess(method.i, role)) {
        return stream.write(engine.log('E', new Error('Flow target instance "' + method.i._name + '" is not found.')));
    }

    // get method function
    method = getMethodFunction(method);

    if (!method.m) {
        return;
    }

    // append as data handler
    if (method.h > 1) {

        // add data handler as first argument
        stream[method.h < 3 ? 'data' : 'error'].call(stream, method.m, method.a, method.o);

    // call stream handler
    } else {

        // disable stream input
        stream._i = method.h ? null : stream._i;
        method.m.call(method.i, stream, method.a);
    }
}

function parseConfig (flow, instance) {

    var method = {
        i: instance,
        o: {}
    };

    if (typeof flow === 'function') {
        method.m = flow;
        return method;
    }

    if (flow instanceof Array) {
        method.m = flow[0];
        method.a = flow[1];

        // TODO implement option handler. reuse transform handler
        method.o = flow[2] || transform;
    } else {
        method.m = flow;
    }

    var type = method.m[0];
    method.h = type === '>' ? 1 : type === ':' ? 2 : type === '!' ? 3 : 0;

    if (method.h) {
        method.m = method.m.substr(1);
    }

    if (method.m.indexOf('/') > 0) {
        method.m = (instance = method.m.split('/'))[1];
        method.i = engine.instances[instance[0]] || instance[0];
    }

    return method;
}

/**
 * Return a function or undefined.
 */
function getMethodFunction (method) {

    if (typeof method.m === 'function') {
        return method;
    }

    var _path = method.m;
    if (
        typeof _path === 'string' &&
        typeof (method.m = utils.path(method.m, [method.i, global])) !== 'function'
    ) {
        engine.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + method.i._name));
        return method;
    }

    return method;
}
