"use strict";

var Stream = require('./stream');
var Instance = require('./instance');
var transform = require('./transform');
var utils = require('./utils');
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

        eventStream.out.session = options.session;
        eventStream.cork();

        // load or get instance
        CoreInst.load(options.to, options.session, function (err, instance) {

            if (err) {
                return eventStream.out.end(err.toString());
            }

            // link event handler to event stream
            getEvent(instance, options, function (err, flowEvent) {

                if (err) {
                    return eventStream.end(err.toString());
                }
console.log(flowEvent);
                eventStream._fe = flowEvent;
                eventStream.uncork();
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

    // return cached event
    if (instance._events[options.emit]) {
        return callback(null, instance._events[options.emit]);
    }

    if (!instance._flow[options.emit]) {
        return callback(new Error('Flow.getEvent: Event "' + options.emit + '" not found on instance "' + instance._name+ '".'));
    }

    
    // collect all handlers for specific flow event
    var handlers = instance._events[options.emit] = {
        d: [],
        e: [],
        s: []
    };
    var flow = instance._flow[options.emit];
    var count = 0;
    var parse = function (config, index) {

        if (count === flow.length) {
            return callback(null, handlers);
        }

        if (typeof config === 'string') {
            config = [config];
        }

        let instName = instance._name;

        // get target instance
        if (config[0].indexOf('/') > 0) {
            config[0] = config[0].split('/');
            instName = config[0][0];
            config[0]= config[0][1];
        }

        // get handler type
        var type = 'd';
        switch (config[0][0]) {
            case '!':
                type = 'e';
            case '>':
                type = 's';
        }

        CoreInst.load(instName, options.session, function (err, instance) {

            ++count;

            if (err) {
                handlers.e[index] = err; 
                return parse();
            }

            let fn = utils.path(config[0], [instance, global]);
            if (typeof fn !== 'function') {

                handlers.e[index] = new Error('Flow.getEvent: Method "' + config[0] + '" on instance "' + instance._name + '" not found.'); 
                return parse();
            }

            handlers[type][index] = [instance, fn, config[1]];
            
            parse();
        }); 
    };

    // get data handlers in paralell
    flow.forEach(parse);
}
