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
            return console.error('E', new Error('Flow call without event name.'));
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
                    console.log(err)
                    return eventStream.out.end(err);
                }

                // append only the first section of handler to flowEvent
                // split data handlers after every ext/net stream
                // create new Event stream for every section?\

                // append section 0 to event stream
                eventStream._fe = flowEvent[0];

                // setup sub streams (sections)
                var subStream = eventStream;
                flowEvent.forEach(function (section, index) {

console.log('\n\nSECTION ' + index + ':\n', section);

                    // call flow or stream handler
                    if (section.linki && 1===2) {

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

                    //subStream._fe = section;
                });

                eventStream.uncork();
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

function getEvent (instance, options, callback) {

    // return cached event
    if (instance._events[options.emit]) {
        return callback(null, instance._events[options.emit]);
    }

    if (!instance._flow[options.emit]) {
        return callback(new Error('Flow.getEvent: Event "' + options.emit + '" not found on instance "' + instance._name+ '".'));
    }

    // collect all handlers for specific flow event
    var handlers = instance._events[options.emit] = [];
    var flow = instance._flow[options.emit];
    var count = 1;
    var section = 0;
    var errorHappend;
    var parse = function (config, index) {

        if (errorHappend) {
            return;
        }

        if (config && config.constructor === Error) {
            errorHappend = true;
            return callback(config);
        }

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
        let method = config[0];
        let args = config[1];
        let type = method[0];
        method = method.substr(1);

        // get target instance
        if (method.indexOf('/') > 0) {
            method = method.split('/');
            instName = method[0];
            method = method[1];
        }

        handlers[section] = handlers[section] || {};

        /*
            data: ":"
            error: "!"
            junction: ">"
            pipe: "|"
        */
        if (type === '>' || type === '|' ||  type === '*') {
            // create sections
            handlers[++section] = {};
            handlers[section][type] = [[instance, method, {}]];
        } else {
            // append handlers
            handlers[section][type] = handlers[section][type] || [];
            handlers[section][type].push([instance, method, config[1]]);
        }

        var reference = [handlers[section][type], handlers[section][type].length - 1];
        CoreInst.load(instName, options.session, function (err, instance) {

            ++count;

            if (err) {
                return parse(err);
            } 

            // get handler function
            let ref = reference[0][reference[1]];
            let fn = utils.path(ref[1], [instance, global]);
            if (typeof fn !== 'function') {
                return parse(new Error('Flow.getEvent: Method "' + ref[1] + '" on instance "' + instance._name + '" not found.'));
            }
            ref[1] = fn;
            
            parse();
        }); 
    };

    // get data handlers in paralell
    flow.forEach(parse);
}
