"use strict";

var Stream = require('./stream');
var Instance = require('./instance');
var parseEvent = require('./parse');
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
    CoreInst.reset = Instance.reset;

    // save core instance in instances cache
    Instance.instances[CoreInst._name] = CoreInst;

    // init event parser with core instance
    parseEvent = parseEvent(CoreInst);

    return CoreInst;
};

// flow factory
function factory (object) {

    var clone = Object.create(object);
    clone.flow = emit;
    clone._flow = clone._flow || {};
    return clone;
}

function emit (eventName,  options, callback) {

    /*
        this.flow(flowEvent, {
            to: 'instance',
            end: function () {}
            net: http|ws
            session: {}
        });
    */

    options = typeof options === 'function' ? {end: options} : options || {};
    options.emit = eventName;

    if (typeof callback === 'function') {
        options.end = callback;
    }

    // return if event name is missing
    if (!options.emit) {
        throw new Error('Flow call without event name.');
    }

    options.session = options.session || {};
    options.to = options.to || this._name;

    // call event on server
    if (options.net) {
        return CoreInst.request(CoreInst, options);
    }

    // create new event stream
    var eventStream = Stream.Event(options);
    eventStream.cork();

    // load or get instance
    CoreInst.load(options.to, options.session, function (err, instance) {

        if (err) {
            return eventStream.emit('error', err);
        }

        // link event handler to event stream
        getEvent(instance, options, function (err, flowEvent) {

            if (err) {
                return eventStream.emit('error', err);
            }

            // setup sub streams (sequences)
            var lastSeq;
            if (flowEvent.d) {
                lastSeq = linkStreams(instance, eventStream, flowEvent, options);
            }

            // end handler
            if (flowEvent.e) {
                (lastSeq || eventStream).on('end', function () {
                    if (!this._errEmit) {
                        instance.flow(flowEvent.e).end(true);
                    }
                });
            }

            eventStream.emit('sequence');
            eventStream.uncork();
        });
    });

    return eventStream;
};

function linkStreams (instance, eventStream, flowEvent, options) {

    var sections = flowEvent.d;
    eventStream.seq = sections[0][0];

    var count = 0;
    var errEvent = flowEvent.r ? instance.flow(flowEvent.r) : undefined;
    var prevStream = eventStream;
    var handleError = function (err) {

        // write error to error event
        if (errEvent) {
            return errEvent.end(err);
        }

        // TODO option to end stream

        // log error in console
        console.error(err);
    };

    sections.forEach(function (section, index) {

        if (index === 0) {
            return;
        }

        if (!section[1]) {
            return;
        }

        // call flow or stream handler
        var linked;
        var shOptions = Object.create(section[1][1][1]);
        shOptions.session = options.session;

        // create a new sub-stream to call handlers
        var subStream = Stream.Event(options);
        subStream.seq = section[0];
        subStream.on('error', handleError);
        shOptions._nextSeq= subStream;

        if (typeof section[1][1][0] === 'string') {
            linked = instance.flow(section[1][1][0], shOptions); 
        } else {
            linked = section[1][1][0].call(section[1][1][2], prevStream, shOptions) || {};
        }

        // attach linked stream to input stream
        if (linked && linked.writable) {
            prevStream.wOM = !!linked._writableState.objectMode;
            prevStream.pipe(linked);
        }

        // bubble errors backwards
        if (linked && typeof linked.on === 'function') {
            linked.on('error', handleError);
        }

        // write linked data to section
        if (linked && linked.readable) {
            linked.pipe(subStream);
        }

        // leaking streams
        if (section[1][0] === '|') {
            prevStream.pipe(subStream);
        }

        // overwrite previous stream
        prevStream = subStream;

        // bypass data handler and push directly to readable
        if (sections.length === ++count) {
            prevStream.on('data', eventStream.push.bind(eventStream));
        }
    });

    return prevStream;
}

var cbBuffer = {};
function getEvent (instance, options, callback) {

    // return cached event
    if (instance._events[options.emit]) {
        return callback(null, instance._events[options.emit]);
    }

    // buffer callback
    if (cbBuffer[options.emit]) {
        return cbBuffer[options.emit].push(callback);
    }

    // check if event is configured
    if (!instance._flow[options.emit]) {
        return callback(new Error('Flow.getEvent: Event "' + options.emit + '" not found on instance "' + instance._name+ '".'));
    }

    // collect all handlers for specific flow event
    cbBuffer[options.emit] = [];
    parseEvent(instance, options, function (err, event) {
        
        if (!err) {

            // cache event
            instance._events[options.emit] = event;
        }

        callback(err, event);

        // call buffered callbacks
        if (cbBuffer[options.emit]) {
            cbBuffer[options.emit].forEach(function (cb) {
                cb(err, event);
            });
            delete cbBuffer[options.emit];
        }
    });
}
