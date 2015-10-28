var Stream = require('./stream');
var Instance = require('./instance');
var transform = require('./transform');
var utils = require('./utils');
var CoreInst;

// set adapter api object (singleton)
module.exports = function (adapter) {

    if (CoreInst) {
        return CoreInst;
    }

    // create core instance
    CoreInst = factory(adapter);

    CoreInst.load = Instance.factory;
    CoreInst.link = link;
    CoreInst.factory = factory;
    CoreInst._name = '@';

    return CoreInst;
};

// a message is a duplex stream, request a readable and response a writable
function link (event, readable, writeable) {
    // TODO pipe streams to flow event stream
}

// flow factory
function factory (object) {

    var clone = Object.create(FlowEmitter);

    if (object) {
        Object.keys(object).forEach(function (key) {
            clone[key] = object[key];
        });
    }

    clone._flow = clone._flow || {};
    clone.log = clone.log || CoreInst.log;
    return clone;
}

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
        var callback;

        // setup event stream directly if eventName is an object
        if (typeof stream === 'object') {
            ++stream._events;
            utils.nextTick(Flow, this, stream, eventName, stream);
            return stream;
        }

        // special case for the flow method, cause this method
        // can be called from the code `this.flow('event', true)`
        if (typeof stream === 'string') {
            callback = options;
            eventName = stream;
            stream = undefined;
        } else if (typeof options === 'object') {
            eventName = options.emit;
        }

        // return if event name is missing
        if (!eventName) {
            return this.log('E', new Error('Flow call without event name.'));
        }

        // create new event stream
        var eventStream = stream || Stream();

        // TODO pipe stream to a request if event name starts with @ or /
        // call event on server
        if (
            eventName[0] === '@' ||
            eventName[0] === '/' &&
            typeof CoreInst.request === 'function'
        ) {
            eventStream = CoreInst.request(eventStream, eventName);
        }

        var events = this._flow;

        // check if event exists
        if (events[eventName] && events[eventName].length) {

            var i, l;
            var config;
            var callSh = function (sh) {
                sh[1].call(sh[0], eventStream, sh[2]);
            };

            // call handlers
            for (i = 0, l = events[eventName].length, flowEvent; i < l; ++i) {
                if ((flowEvent = events[eventName][i])) {

                    // flow event stream
                    // TODO check if flow event exists otherwise create it
                    if (flowEvent.constructor === Array) {
                        eventStream.pause();
                        createEvent(this, flowEvent, function (flowEvent) {

                            // call stream handlers
                            if (flowEvent.sh) {
                                flowEvent.sh.forEach(callSh);
                            }

                            flowEvent.pipe(eventStream);

                            // remove from event buffer, if once is true
                            if (flowEvent.one) {
                                flowEvent = null;
                            }

                            eventStream.resume();
                        });
                        return;
                    }

                    // ..do the same like the createEvent callback above
                }
            }
        }

        // TODO setup request flow event call
        if (callback) {
            eventStream.on('data', function (chunk) {
                // TODO handle binary data
                eventStream.reqData += chunk;
            });
            eventStream.on('error', function (err) {
                eventStream.reqErr = err;
            });
            eventStream.on('end', function () {
                callback(eventStream.reqErr, eventStream.reqData);
            });
        }

        // return transmitter to send and receive data
        return eventStream;
    },

    ALTR: transform,
    BUFR: function () {},

    /**
     * Empties all caches and reloads the modules.
     *
     * @public
     */
    ERES: function (stream) {

        Stream.reset();
        Instance.reset();

        if (typeof CoreInst.reset === 'function') {
            CoreInst.reset();
        }

        CoreInst.load();

        return stream;
    }
};

function createEvent (instance, config, callback) {
    // TODO get method refs and create flow event stream
    // TODO return a stream
    var reverseEmitter = {
        one: false,
        pipe: function (stream) {
            stream.on('data', Flow(stream, flowEvent.dh));
            stream.on('error', Flow(stream, flowEvent.rh));
            stream.on('end', Flow(stream, flowEvent.eh));
        }
    };

    callback();
}

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
function Flow (instance, stream, handlers) {

    // TODO call every handler in order (asyn, next())

    //handler[1].call(handler[0], stream, handler[2]);

}
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
    var role = (session || {}).role;

    // load module instance
    if (typeof method.i === 'string') {

        // load instance
        return load(method.i, role, function (err, method_instance) {

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
        return stream.write(console.log('E', new Error('Flow target instance "' + method.i._name + '" is not found.')));
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
        method.i = instances[instance[0]] || instance[0];
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
        console.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + method.i._name));
        return method;
    }

    return method;
}
