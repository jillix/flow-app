//var Stream = require('./stream');
var Stream = require('stream');
var EventEmitter = require('events');
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

// a message is a duplex stream, request a readable and response a writable
function link (event, readable, writeable) {
    // TODO pipe streams to flow event stream
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
            process.nextTick(Flow, this, stream, eventName, stream);
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
            callback = options.end;
        }

        // return if event name is missing
        if (!eventName) {
            return this.log('E', new Error('Flow call without event name.'));
        }

        // create new event stream
        stream = stream || Stream();

        // TODO pipe stream to a request if event name starts with @ or /
        // call event on server
        if (
            eventName[0] === '@' ||
            eventName[0] === '/' &&
            typeof CoreInst.request === 'function'
        ) {
            stream = CoreInst.request(stream, eventName);
        }

        // call events on the client
        var instance = this;
        var events = instance._flow;

        // check if event exists
        if (events[eventName] && events[eventName].length) {

            // TODO check event access
            //if (session && !utils.roleAccess(method.i, role)) {
            //    return stream.write(console.log('E', new Error('Flow target instance "' + method.i._name + '" is not found.')));
            //}

            // call handlers
            events[eventName].forEach(function (flow, index, cache) {

                // create flow event stream
                if (flow.constructor === Array) {
                    stream.pause();
                    createEvent(instance, eventName, flow, function (flow) {
                        pipeToFlow(stream, flow, index, cache, callback);
                        stream.resume();
                    });
                    return;
                }

                // pipe to already existing event stream
                pipeToFlow(stream, flow, index, cache, callback);
            });
        }

        // return transmitter to send and receive data
        return stream;
    },

    /**
     * Standard data transform
     *
     * @public
     */
    ALTR: transform,

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

    // parse config
    // get instances if not yet loaded
    // create event object with method refs
    // create data\error\end handlers for streams
    var Writable = Stream.Writable;
    var wStd = Writable();
    wStd.sh = [];
    wStd.dh = [];
    wStd.rh = [];
    wStd.eh = [];
    wStd.event = function () {
        // call stream handlers
    };

    wStd._write = function (chunk, enc, next) {

        // check if it's an error
        // - call error handlers
        // call all data handlers
    };

    // call all end handlers
    wStd.on('finish', function () {

        // call all end handlers
    });

    /*
    var dh;
    var pos = -1;
    var next = function (err, data) {

        // update handler ref
        dh = this.dh[++pos];

        if (!dh || data === null) {
            // end stream
        }

        if (err) {
            // emit an error (call error handlers)
        }

        dh[1].call(dh[0], stream, dh[2], data, next);
    };

    return function (data) {
        next(null, data);
    };
    */

    console.log(ws);

    callback();
}

function pipeToFlow (stream, flow, index, cache, callback) {

    // call stream handlers
    flow.event(stream);
    stream.pipe(flow);

    // remove from event cache, if once is true
    if (flowEvent.one) {
        cache[index] = null;
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
}

/*
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
}*/
