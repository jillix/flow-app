var Stream = require('./stream');
var Socket = require('./socket');
var utils = require('./utils');

// export event emitter object (clone before use!)
module.exports = function (emitter) {

    // merge flow emitter to existing object
    if (emitter) {

        for (var key in FlowEmitter) {
            emitter[key] = FlowEmitter[key];
        }

    // create a new emitter
    } else {
        emitter = utils.clone(FlowEmitter);
    }

    emitter._flows = {};
    return emitter;
};

var FlowEmitter = {
  
    handlers: {
        transform: require('./transform'),
        link: Socket.stream,
        load: engine.load
    },

    /**
     * Call flow handlers which listen to event.
     *
     * @public
     * @param {string} The event name.
     */
    flow: function (eventName, context) {
        var events = this._flows;

        // create streams
        var stream = createStream(this, context);
        stream.pause();
        
        // setup event stream directly if eventName is an object
        if (typeof eventName === 'object') {
            Flow(this, createStream(this, context, stream), eventName);
            return stream;
        }

        // check if event exists
        if (events[eventName] && events[eventName].length) {

            // index for events that must be removed
            var obsoleteEvents = [];
            var i, l;
            var config;

            // call handlers
            for (i = 0, l = events[eventName].length; i < l; ++i) {
                if ((config = events[eventName][i])) {

                    // pass stream to flow to setup handlers
                    Flow(this, createStream(this, context, stream), config);

                    // remove from event buffer, if once is true
                    if (config['1']) {
                        config = undefined;
                        obsoleteEvents.push([eventName, i]);
                    }
                }
            }

            // remove obsolete events
            if (obsoleteEvents.length) {
                for (i = 0, l = obsoleteEvents.length; i < l; ++i) {

                    // remove handler
                    events[obsoleteEvents[i][0]].splice(obsoleteEvents[i][1], 1);

                    // remove event
                    if (events[obsoleteEvents[i][0]].length === 0) {
                        delete events[obsoleteEvents[i][0]];
                    }
                }
            }
        }
        
        stream.resume();

        // return transmitter to send and receive data
        return stream;
    },

    /**
     * Mind an an event.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {object} The flow handler config.
     */
    mind: function (config) {

        var event = config[0];
        var events = this._flows;
        
        (this._access || (this._access = {}))[event] = true;

        if (!events[event]) {
            events[event] = [];
        }

        // copy and push the flow config
        // TODO is coping necessary??
        events[event].push(config.slice(1));

        return this;
    }
};

function createStream (instance, context, inputStream) {
    var stream = Stream(instance, inputStream || (context && context.stream));
    
    // merge context into steam
    if (context) {
        for (var prop in context) {
            stream[prop] = context[prop];
        }
    }
    
    return stream;
}

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
function Flow (instance, stream, config) {
    var session = stream.session;
    var role = (session || {})[engine.session_role];
    
    for (var i = 0, l = config.length, flow, method, args; i < l; ++i) {
        flow = config[i];
        args = [stream];
        
        if (flow instanceof Array) {
            method = flow[0];
            args = args.concat(flow.slice(1));
        } else {
            method = flow;
        }

        // call function directly
        if (typeof method === 'function') {
            return method.apply(instance, args);
        }
        
        method = parseMethodPath(method, instance);
        
        if (typeof method[0] === 'string') {

            // load instance
            return engine.load(method[0], role, function (err, instance) {
    
                if (err) {
                    return stream.write(err).resume();
                }
                
                method[0] = instance;
            });
        }

        // check access
        if (session && !utils.roleAccess(instance, role)) {
            return stream.write(engine.log('E', new Error('Flow target instance "' + instance._name + '" is not found.')));
        }

        // get method
        method[1] = getMethodFromPath(method[0], method[1]);
        
        if (!method[1]) {
            return;
        }
        
        // append as data handler
        if (method[2]) {
            stream.data(method[0], args);
            
        // call stream handler
        } else {
            method[1].apply(method[0], args);
        }
    }
}

function parseMethodPath (path, instance) {
    
    var method = [instance, path];
    
    // check if path is a data handler
    if (path[0] === ':') {
        method[1] = path = path.substr(1);
        method[2] = true;
    }
    
    if (path.indexOf('/') > 0) {
        path = path.split('/');
        method[0] = engine.instances[path[0]] || path[0];
        method[1] = path[1];
    }
    
    return method;
}

/**
 * Return a function or undefined.
 */
function getMethodFromPath (module_instance, path) {

    if (typeof path === 'function') {
        return path;
    }

    var _path = path;
    if (
        typeof path === 'string' &&
        typeof (path = utils.path(path, [module_instance.handlers, module_instance, global])) !== 'function'
    ) {
        engine.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + module_instance._name));
        return;
    }

    return path;
}
