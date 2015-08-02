var Stream = require('./stream');
var Socket = require('./socket');
var transform = require('./transform');
var utils = require('./utils');

var _streams = {};

// TEMPORARY CODE
// =====================================================================
engine._r.push(function () {
    _streams = {};
    engine._totalStreams = 0;
});
engine._streamStats = function (lines) {

    var sortable = [];
    
    lines = lines || -2;
    --lines;

    for (var stream in _streams) {
        if (_streams[stream] > 1) {
            sortable.push([_streams[stream], stream]);
            sortable.sort(function(a, b) {return b[0] - a[0]});
        }
    }

    console.log('%cTotal stream count: ' + engine._totalStreams, "font-weight:bold;font-size:12px");
    console.log('%cInstance events with more then 1 stream:', "font-style:italic;color:darkgreen;text-decoration:underline");
    for (var i = 0, l = sortable.length; i < l; i++) {
        console.log('Count:', sortable[i][0], 'Key:', sortable[i][1]);
        if (lines > -1 && i === lines) {
            return;
        }
    }
};

// flow factory
module.exports = function (emitter) {

    if (!FlowEmitter._flowFn.reload) {
        FlowEmitter._flowFn.reload = engine.reload;
    }

    // merge flow emitter to existing object
    if (emitter) {

        for (var key in FlowEmitter) {
            emitter[key] = FlowEmitter[key];
        }

    // create a new emitter
    } else {
        emitter = utils.clone(FlowEmitter);
    }

    emitter._flows = {};
    return emitter;
};

function loadHandler (stream, instances) {
    if (instances instanceof Array) {
        for (var i = 0, l = instances.length; i < l; ++i) {
            engine.load(instances[i]);
        }
    }
}

function flowHandler (stream, event) {
    // stream.o -> event_stream
    // event_stream.i -> stream
    return this.flow(event, stream);
}

function linkHandler (stream, url) {

    // indicate that stream pipes an external stream
    stream._broken = true;

    return Socket.stream(stream, url);
}

var FlowEmitter = {

    _flowFn: {
        transform: transform,
        link: linkHandler,
        load: loadHandler,
        emit: flowHandler
    },

    /**
     * Call flow handlers which listen to event.
     *
     * @public
     * @param {string} The event name.
     */
    flow: function (eventName, stream) {
        var events = this._flows;

        // create streams
        stream = stream || Stream(this);
        stream.pause();
        stream._events = 0;

        // TEMPORARY CODE
        // ==================================================================
        if (typeof eventName === 'string') {
            var streamKey = this._name + ':' + eventName;
            
            if (!_streams[streamKey]) {
                _streams[streamKey] = 0;
            }
            
            ++_streams[streamKey];
        }

        // setup event stream directly if eventName is an object
        if (typeof eventName === 'object') {
            ++stream._events;
            utils.nextTick(Flow, this, stream, eventName, stream, null);
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

    /**
     * Mind an an event.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {object} The flow handler config.
     */
    mind: function (config) {

        var event = config[0];
        var events = this._flows;

        (this._access || (this._access = {}))[event] = true;

        if (!events[event]) {
            events[event] = [];
        }

        // copy and push the flow config
        events[event].push(config);

        return this;
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
        count = count === null ? -1 : 0;

        // create new stream for every listener
        stream = Stream(instance, stream).pause();
    }

    // get flow config
    var flow = config[++count];
    var last = config[count + 1] ? false : true;

    // resume stream and return
    if (!flow) {

        if (!--flowStream._events) {
            flowStream.resume();
        }

        return stream.resume();
    }

    var method = parseConfig(flow, instance);
    var session = stream.session;
    var role = (session || {})[engine.session_role];

    // load module instance
    if (typeof method.i === 'string') {

        // load instance
        return engine.load(method.i, role, function (err, method_instance) {

            if (err) {
                return Flow(instance, stream, config, flowStream, count);
            }

            stream._ = method_instance;
            method.i = method_instance;
            stream = callStreamHandler(stream, method, session, role, last);

            Flow(instance, stream, config, flowStream, count);
        });
    }

    stream = callStreamHandler(stream, method, session, role, last);
    Flow(instance, stream, config, flowStream, count);
}

function callStreamHandler (stream, method, session, role, last) {

    // check access
    if (session && !utils.roleAccess(method.i, role)) {
        stream.write(engine.log('E', new Error('Flow target instance "' + method.i._name + '" is not found.')));
        return stream;
    }

    // get method function
    method = getMethodFunction(method);

    if (!method.f) {
        return stream;
    }

    // append as data handler
    if (method.h > 1) {

        // add data handler as first argument
        stream[method.h < 3 ? 'data' : 'error'].apply(stream, [[method.i, method.f]].concat(method.a));

    // call stream handler
    } else {

        // add stream as first argument for stream handlers
        method.a.unshift(stream);

        // disable stream input
        stream._i = method.h ? null : stream._i;

        var handlerStream = method.f.apply(method.i, method.a);
        if (!last && handlerStream && handlerStream._.flow)  {

            // replace and connect stream with a returned stream from the stream handler
            stream = Stream(handlerStream._, handlerStream).pause();
            handlerStream.resume();
        }
    }

    return stream;
}

function parseConfig (flow, instance) {

    var method = {
        i: instance,
        a: []
    };

    if (typeof flow === 'function') {
        method.f = flow;
        return method;
    }

    if (flow instanceof Array) {
        method.f = flow[0];
        method.a = flow.slice(1);
    } else {
        method.f = flow;
    }

    var type = method.f[0];
    method.h = type === '>' ? 1 : type === ':' ? 2 : type === '!' ? 3 : 0;

    if (method.h) {
        method.f = method.f.substr(1);
    }

    if (method.f.indexOf('/') > 0) {
        method.f = (instance = method.f.split('/'))[1];
        method.i = engine.instances[instance[0]] || instance[0];
    }

    return method;
}

/**
 * Return a function or undefined.
 */
function getMethodFunction (method) {

    if (typeof method.f === 'function') {
        return method;
    }

    var _path = method.f;
    if (
        typeof _path === 'string' &&
        typeof (method.f = utils.path(method.f, [method.i, method.i._flowFn, global])) !== 'function'
    ) {
        engine.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + method.i._name));
        return method;
    }

    return method;
}
