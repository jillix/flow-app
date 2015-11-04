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
     *
     * @public
     * @param {Object} stream The stream object.
     * @param {Object} options Method options.
     * @param {String} options.emit The event name to emit.
     * @param {Boolean} options.end Call this function on stream end (callback).
     */
    flow: function (stream, options) {

        // handle arguments
        var eventName;
        var endHandler;

        // TODO parse arguments
        /*
            // from code
            this.flow('eventName');
            this.flow('/eventName');
            this.flow('@eventName');
            this.flow('instance/eventName');
            this.flow('/instance/eventName');
            this.flow('@instance/eventName');
            this.flow('eventName', function (err, data) {});

            // from flow event config
            this.flow(flowEvent, {
                to: 'instance',
                emit: 'eventName',
                end: function () {}
            });
        */

        // special case for the flow method, cause this method
        // can be called from the code `this.flow('event', true)`
        if (typeof stream === 'string') {
            endHandler = options;
            eventName = stream;
            stream = undefined;
        } else if (typeof options === 'object') {
            eventName = options.emit;
            endHandler = options.end;
        }

        // return if event name is missing
        if (!eventName) {
            return this.log('E', new Error('Flow call without event name.'));
        }

        var instance = this;

        // call event on server
        if (eventName[0] === '@' || eventName[0] === '/') {
            return CoreInst.request(instance, eventName, endHandler);
        }

        // check access to instance
        if (!utils.access(instance, stream.session)) {
            // TODO write error to stream
            //stream.write();
            console.log(new Error('Flow: Access denied to instance "' + instance._name + '".'));
            return;
        }

        // check if event exists
        var events = instance._flow;
        if (events[eventName] && events[eventName].length) {

            // create new event stream
            var eventStream = Stream.Event(stream, options.err);

            // link event handler to event stream
            getEvent(instance, eventName, function (err, flowEvent) {

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

            return eventStream;
        }
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

function getEvent (instance, eventName, callback) {
    
    instance = eventName.indexOf('/' > 2) ? eventName.split('/')[1] : instance._name;
    CoreInst.load(instance, function (err, instance) {
 
        if (!instance._flow[eventName]) {
            return callback(new Error('Flow.getEvent: Event "' + eventName + '" not found.'));
        }

        // return cached event
        if (instance._events[eventName]) {
            return callback(null, instance._events[eventName]);
        }

        // create event
        createEvent(instance, eventName, callback);
    });
}

function createEvent (instance, eventName, callback) {

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
    
    var flowEvent = {
        dh: [
            instance.method
        ],
        rh: [],
        eh: [],
        sh: [],
        ondata: function (stdout, stderr, chunk, enc, cb) {
            console.log('Event data:', chunk ? chunk.toString() : chunk);

            var write = function (err, data) {
                if (err) return stderr.write(err);
                stdout.write(data);

                // emit response data on the stdin stream
                // for in code usage.
                // this.flow(...).ondata = function (err, data));
                if (typeof stdin.ondata === 'function') {
                    stdin.ondata(err, data);
                }
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

    // parse flow config
    parse(instance, flow, function (err, flow) {

        // callback error
        if (err) {
            return callback(err);
        }

        callback(null, hStream);
    });
}

