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
            return this.log('E', new Error('Flow call without event name.'));
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
                    return eventStream.out.end(err);
                }
console.log(flowEvent);
                // append only the first section of handler to flowEvent
                // split data handlers after every ext/net stream
                // create new Event stream for every section?\

                // setup sub streams (sections)
                var subStream = eventStream;
                flowEvent.forEach(function (section) {

                    // call flow or stream handler
                    if (section.link) {

                        let linked;

                        if (section.link.t === '>' || section.link.t === '|') {
                            linked = section.link.i.flow(section.link.e, options); 
                        } else {
                            // TODO call stream handler
                            linked = {};

                            if (linked.pipe) {
                                // TODO check if linked is a duplex stream
                            }
                        }

                        subStream = Stream.Event(options);
                        subStream.pipe(linked).pipe(subStream);
                    }

                    subStream._fe = section;
                });

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
    var handlers = instance._events[options.emit] = [{
            d: {},
            e: {}
        }];
    var flow = instance._flow[options.emit];
    var count = 0;
    var section = 0;
    var parse = function (config, index) {

        if (count === flow.length) {
            return callback(null, handlers);
        }

        if (!config) {
            return;
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

        
        CoreInst.load(instName, options.session, function (err, instance) {

            ++count;

            if (err) {
                handlers.e[index] = err; 
                return parse();
            }

            // get handler type
            /*
                data: ":"
                error: "!"
                junction: ">"
                pipe: "|"
            */
            let type = config[0][0];
            config[0] = config[0].substr(1);

            if (type === '>' || type === '|' ||  type === '*') {
                // create sections
                handler[++section] = {
                    i: instance,
                    s: config[0],
                    t: type,
                    d: {},
                    e: {}
                }; 
            }

            let fn = utils.path(config[0], [instance, global]);
            if (typeof fn !== 'function') {

                handlers.e[index] = new Error('Flow.getEvent: Method "' + config[0] + '" on instance "' + instance._name + '" not found.'); 
                return parse();
            }

            handlers[section][type === ':' ? 'd' : 'e'][index] = [instance, fn, config[1]];
            
            parse();
        }); 
    };

    // get data handlers in paralell
    flow.forEach(parse);
}
