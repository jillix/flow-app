var Stream = require('./stream');
var Instance = require('./instance');
var transform = require('./transform');
var utils = require('./utils');
var parse = require('./parse');
var CoreInst;
var requiredAdapterMethods = ['module', 'composition', 'request'];

// set adapter api object (singleton)
module.exports = function (adapter) {

    if (CoreInst) {
        return CoreInst;
    }

    // check if adapter has all the required methods.
    requiredAdapterMethods.forEach(function (key) {
        if (typeof adapter[key] !== 'function') {
            throw new Error('Flow: "adapter.' + key + '" is not a function.');
        }
    });

    // create core instance
    CoreInst = factory(adapter);

    CoreInst.load = Instance.factory;
    CoreInst.factory = factory;
    CoreInst._name = '@';
    CoreInst._roles = {'*': true};
    CoreInst._ready = true;
    CoreInst._events = {};

    // save core instance in instances cache
    Instance.instances[CoreInst._name] = CoreInst;

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

var FlowEmitter = {

    /**
     * Call flow handlers which listen to event.
     */
    flow: function (stream, options, callback) {

        /*
            this.flow(flowEvent, {
                to: 'instance',
                emit: 'eventName',
                end: function () {}
                net: http|ws
            });
        */

        options = typeof options === 'function' ? {end: options} : options || {};
        if (typeof callback === 'function') {
            options.end = callback;
        }

        // special case for the flow method, cause this method
        // can be called from the code `this.flow('event', true)`
        if (typeof stream === 'string') {
            options.emit = stream;
            stream = undefined;
        }

        // return if event name is missing
        if (!options.emit) {
            return this.log('E', new Error('Flow call without event name.'));
        }
       
        options.session = stream ? stream.session || {} : {};
        options.to = options.to || this._name;

        // call event on server
        if (options.net) {
            return CoreInst.request(options);
        }

        // create new event stream
        var eventStream = Stream.Event(stream, options.err);

        // load or get instance
        CoreInst.load(options.to, options.session, function (err, instance) {
                
            if (err) {
                return eventStream.end(err.toString());
            }

            // link event handler to event stream
            getEvent(instance, options, function (err, flowEvent) {

                if (err) {
                    return eventStream.end(err.toString());
                }

                eventStream._fe = flowEvent;
                eventStream._write = function (chunk, enc, cb) {

                    // write buffered data to flow event
                    if (eventStream._buf.length) {
                        eventStream._buf.forEach(function (data) {
                            eventStream._fe.ondata(eventStream.stdout, eventStream.stderr, data[0], data[1], data[2]);
                        });
                        eventStream._buf = [];
                    }

                    eventStream._fe.ondata(eventStream.stdout, eventStream.stderr, chunk, enc, cb);
                };
            });
        });

        return eventStream;
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

        Instance.reset();

        if (typeof CoreInst.reset === 'function') {
            CoreInst.reset();
        }

        CoreInst.load();

        return stream;
    }
};

function getEvent (instance, options, callback) {
console.log('FLOW GET EVENT:', options);
    // return cached event
    if (instance._events[options.emit]) {
        return callback(null, instance._events[options.emit]);
    }

    if (!instance._flow[options.emit]) {
        return callback(new Error('Flow.getEvent: Event "' + options.emit + '" not found on instance "' + instance._name+ '".'));
    }

    var flows = instance._flow[options.emit];
    var count = 0;
    var flowEvent = {
        dh: [
            instance.method
        ],
        rh: [],
        eh: [],
        sh: [],
        ondata: function (stdout, stderr, chunk, enc, cb) {
            console.log('Event data:', chunk ? chunk.toString() : chunk);
/*
    parse(instance._events[eventName], function (err, event) {
        
    });
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
            var write = function (err, data) {
                if (err) return stderr.write(err);
                stdout.write(data);
            };
            var responde = {
                write: write,
                end: function (err, data) {
                    write(err, data);
                    stderr.end();
                    stdout.end();
                }
            };

            this.dh.forEach(function (handler) {
                handler.call(instance, responde, {}, chunk);
            });

            // TODO cb(error);
            cb();
        }
    };

    var handler = function (err, event, index) {
        
        ++count;

        if (err) {
            return;
        }

        if (count === flows.length) {

        }
    };

    // parse stream handlers in paralell
    flows.forEach(function (flow, index) {
        parse(instance, flow, handler, index);
    });
}
