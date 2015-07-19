var Stream = require('./stream');
var Socket = require('./socket');
var transform = require('./transform');
var utils = require('./utils');

// export event emitter object (clone before use!)
module.exports = function (emitter) {
    
    if (!FlowEmitter._flowFn.reload) {
        FlowEmitter._flowFn.reload = engine.reload;
    }
    
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

function loadHandler (stream, instances) {
    for (var i = 0, l = instances.length; i < l; ++i) {
        engine.load(instances[i]);
    }
}

function flowHandler (stream, event) {
    return stream._.flow(event);
}

function linkHandler (stream, url) {

    // indicate that stream pipes an external stream
    stream._ext = true;

    return Socket.stream(stream, url);
}

var FlowEmitter = {
  
    _flowFn: {
        transform: transform,
        link: linkHandler,
        load: loadHandler,
        emit: flowHandler
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
        
        // setup event stream directly if eventName is an object
        if (typeof eventName === 'object') {
            utils.nextTick(Flow, this, createStream(this, context, stream), eventName, null);
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
                    utils.nextTick(Flow, this, createStream(this, context, stream), config);

                    // remove from event buffer, if once is true
                    if (config[0] instanceof Array) {
                        config = null;
                    }
                }
            }
        }
        
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
        events[event].push(config);

        return this;
    }
};

function createStream (instance, context, inputStream) {
    var stream = Stream(instance, inputStream);
    
    inputStream && stream.pause();
    
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
function Flow (instance, stream, config, count) {

    // handle first call
    if (typeof count !== 'number') {
        count = count === null ? -1 : 0;
    }

    // get flow config
    var flow = config[++count];

    // resume stream and return
    if (!flow) {
        return;
    }

    var method = parseConfig(flow, instance);
    var session = stream.session;
    var role = (session || {})[engine.session_role];

    // load module instance
    if (typeof method[0] === 'string') {

        // load instance
        return engine.load(method[0], role, function (err, method_instance) {

            if (err) {
                return Flow(instance, stream, config, count);
            }
            
            method[0] = method_instance;
            
            Flow(instance, callStreamHandler(stream, method, session, role), config, count);
        });
    }

    Flow(instance, callStreamHandler(stream, method, session, role), config, count);
}

function callStreamHandler (stream, method, session, role) {
    var node;
    
    // check access
    if (session && !utils.roleAccess(method[0], role)) {
        stream.write(engine.log('E', new Error('Flow target instance "' + method[0]._name + '" is not found.')));
        return stream;
    }

    // get method
    method[1] = getMethodFromPath(method[0], method[1]);

    if (!method[1]) {
        return stream;
    }

    // append as data handler
    if (method[3]) {

        // add data handler as first argument
        method[2].unshift(method[1]);
        stream.data.apply(stream, method[2]);

    // call stream handler
    } else {

        // add stream as first argument for stream handlers
        method[2].unshift(stream);
        if ((node = method[1].apply(method[0], method[2])))  {
          
            // replace and connect stream with a returned stream from the stream handler
            stream = Stream(node._, node).pause();
        }
    }
    
    // resume stream
    (node || stream).resume();

    return stream;
}

function parseConfig (flow, instance) {

    var method = [instance, flow, []];
    
    if (typeof flow === 'function') {
        return method;
    }
    
    if (flow instanceof Array) {
        method[1] = flow[0];
        method[2] = flow.slice(1);
    } else {
        method[1] = flow;
    }
    
    // check if path is a data handler
    if (method[1][0] === ':') {
        method[1] = method[1].substr(1);
        method[3] = true;
    }
    
    if (method[1].indexOf('/') > 0) {
        method[1] = method[1].split('/');
        method[0] = engine.instances[method[1][0]] || method[1][0];
        method[1] = method[1][1];
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
        typeof (path = utils.path(path, [module_instance._flowFn, module_instance, global])) !== 'function'
    ) {
        engine.log('E', new Error('Flow method "' + _path + '" is not a function. Instance:' + module_instance._name));
        return;
    }

    return path;
}
