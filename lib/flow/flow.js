"use strict";

var Stream = require('./stream');
var Instance = require('./instance');
var transform = require('./transform');
var utils = require('./utils');
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

    // save core instance in instances cache
    Instance.instances[CoreInst._name] = CoreInst;

    // init event parser with core instance
    parseEvent = parseEvent(CoreInst);

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
    flow: function (eventName,  options, callback) {

        /*
            this.flow(flowEvent, {
                to: 'instance',
                end: function () {}
                net: http|ws
                session: {},
                std: writable
                err: writable
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
        options.net = options.net || 'flow';

        // call event on server
        if (options.net && options.net !== 'flow') {
            return CoreInst.request(options);
        }

        // create new event stream
        var eventStream = Stream.Event(options);
        eventStream.pause();
        eventStream.cork();

        // load or get instance
        CoreInst.load(options.to, options.session, function (err, instance) {

            if (err) {
                return eventStream.emit(err);
            }

            // link event handler to event stream
            getEvent(instance, options, function (err, flowEvent) {

                if (err) {
                    return eventStream.emit(err);
                }

                // setup sub streams (sequences)
                //console.log(JSON.stringify(flowEvent, null, 4));

                if (flowEvent[0]) {
                    linkStreams(instance, eventStream, flowEvent[0], options);
                }

                // emit error event
                if (flowEvent[1]) {
                    eventStream.on('error', function (error) {
                        
                        if (!eventStream.error) { 
                            eventStream.error = instance.flow(flowEvent[1]);
                        }

                        eventStream.error.end(error);
                    });
                }

                eventStream.uncork();
                eventStream.resume();
            });
        });

        return eventStream;
   },

    // Standard data transform
    ALTR: transform,

    // Empties all caches and reloads the modules.
    ERES: function (stream) {

        Instance.reset();

        if (typeof CoreInst.reset === 'function') {
            CoreInst.reset();
        }

        CoreInst.load();

        return stream;
    }
};

function linkStreams (instance, eventStream, sections, options) {

    var prevStream = eventStream;
    sections.forEach(function (section, index) {

        console.log('\n\nSECTION ' + index + ':\n', section);

        if (section[1]) {
            
            // call flow or stream handler
            let linked;
            let shOptions = Object.create(section[1][1][1]);
            shOptions.session = options.session;

            if (typeof section[1][0] === 'string') {
                linked = instance.flow(section[1][0], shOptions); 
            } else {
                linked = section[1][1].call(section[1][0], prevStream, shOptions) || {};
            }

            // attach linked stream to input stream
            if (linked && typeof linked._write === 'function') {
                prevStream.linked = linked;
            }

            // create a new sub-stream to call handlers
            let subStream = Stream.Event(options);
            subStream.seq = section;

            // write linked data to section
            if (linked && typeof linked.pipe === 'function') {
                linked.pipe(subStream);
            }

            // bubble errors backwards
            if (linked) {
                linked.on('error', prevStream.bind(prevStream, 'error').emit);
            }

            // overwrite previous stream
            prevStream = subStream;
        }

        prevStream.seq = section[0];
    });

    // write back to origin
    prevStream.pipe(eventStream);
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
    parseEvent(instance._flow[options.emit], function (err, event) {
        
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
