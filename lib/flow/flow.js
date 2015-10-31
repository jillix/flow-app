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
    CoreInst.link = link;
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

// a message is a duplex stream, request a readable and response a writable
function link (instance, event, readable, writeable) {

    // TODO pipe streams to flow event stream
    var flowEvent = CoreInst.flow(event);

    flowEvent.pipe(writeable || readable);
    readable.pipe(flowEvent);

    flowEvent.write('some data');
    flowEvent.end('end data');

    CoreInst.load(instance, (readable.session || {}).role, function (err, instance) {


    });
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
        // TODO create a duplex stream
        stream = stream || Stream.Event();

        // check access to instance
        var instance = this;
        if (!utils.access(instance, stream.session)) {
            // TODO write error to stream
            //stream.write();
            console.log(new Error('Flow: Access denied to instance "' + instance._name + '".'));
            return;
        }

        // call event on server
        if (eventName[0] === '@' || eventName[0] === '/') {
            return CoreInst.request(instance, eventName, stream, callback);
        }

        // call events on the client
        var events = instance._flow;

        // check if event exists
        if (events[eventName] && events[eventName].length) {

            stream.pause();

            // pipe stream to flow event streams
            var setup = function (cache, index, flow) {

                flow = cache[++index];
                if (flow === undefined) {
                    stream.resume();
                    return;
                }

                // create or get flow event stream
                createEvent(instance, eventName, flow, function (err, flow) {

                    // TODO handle error
                    // pipe to stream
                    pipeToFlow(stream, flow, index, cache, callback);
                    setup(cache, index);
                });
            };

            setup(events[eventName], -1);
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

        Instance.reset();

        if (typeof CoreInst.reset === 'function') {
            CoreInst.reset();
        }

        CoreInst.load();

        return stream;
    }
};

function createEvent (instance, eventName, flow, callback) {

    // return if flow event is already created
    if (flow.constructor !== Array) {
        return callback(null, flow);
    }

    // parse config
    // get instances if not yet loaded
    //CoreInst.load();
    parse(instance, flow, function (err, flow) {

        // callback error
        if (err) {
            return callback(err);
        }

        // TODO update instances event cache with Handler stream
        var hStream = Stream.Handler(flow);

        callback(null, hStream);
    });
}

function pipeToFlow (stream, flow, index, cache, callback) {

    // call stream handlers
    flow.event(stream);
    stream.pipe(flow);

    // remove from event cache, if once is true
    if (flowEvent.one) {
        cache[index] = null;
    }

    // TODO append end handler, when callback is given (this.flow('event', callback)) request mode
}
