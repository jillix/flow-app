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

    /**
     * Call handlers of a specific event or pipe if handler is a stream.
     *
     * @public
     * @param {string} The event name.
     * @param {object} The data for the event handlers.
     */
    flow: function (eventName, context, stream) {
        var events = this._flows;
        
        // create streams
        stream = stream || Stream(this, context);
        
        // setup event stream directly if eventName is an object
        if (eventName && eventName.on) {
            Flow(this, stream, eventName, context);
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
                    Flow(this, stream, config, context);
                    
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
    mind: function (eventName, config) {
        
        var events = this._flows;
        
        if (!events[eventName]) {
            events[eventName] = [];
        }
        
        events[eventName].push(config);
        
        return this;
    }
};

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
function Flow (instance, originStream, config, context) {
    var session = originStream.session;
    var role = (session || {})[engine.session_role];
    
    // handle "to" config
    if (typeof config.to === 'string') {
      
        if (!(instance = engine.instances[config.to])) {
            
            // pause originStream
            originStream.pause();
            
            return engine.load(config.to, role, function (err, instance) {
                
                if (err) {
                    return originStream.write(err).resume();
                }
                
                // create and setup target stream
                createAndSetupStream(instance, originStream, config, context);
                
                // resume orign stream
                originStream.resume();
            });
        }
        
        // check access
        if (session && !utils.roleAccess(instance, role)) {
            return originStream.write(new Error('Flow target instance "' + config.to + '" is not found.'));
        }
    }
    
    createAndSetupStream(instance, originStream, config, context);
}

function createAndSetupStream (instance, originStream, config, context) {

    // create a duplex stream for every event
    var stream = Stream(instance, context);
    
    // pipe duplex streams in both directions
    stream.pipe(originStream).pipe(stream);
    
    // add data handler to stream
    if (
        config.data instanceof Array &&
        (config.data[0] = getMethodFromPath(config.data[0], instance))
    ) {
        stream.data(config.data[0], config.data[1]);
    }

    // emit stream to other flow handlers
    if (typeof config.emit === 'string') {
        instance.flow(config.emit, null, stream);
    }

    // pass stream to receiver function
    if (config.call) {

        // call scket stream handler
        if (typeof config.call === 'string' && config.call.indexOf('/') > -1) {
            Socket.stream(stream, config.call);
        
        // call local method
        } else if ((config.call = getMethodFromPath(config.call, instance))) {
            config.call.call(instance, stream, config);
        }
    }
}

/**
 * Return a function or undefined.
 */
function getMethodFromPath (path, module_instance) {
  
    if (typeof path === 'function') {
        return path;
    }
    
    var _path = path;
    if (
        typeof path === 'string' &&
        typeof (path = utils.path(path, [engine.handlers, module_instance, global])) !== 'function'
    ) {
        console.error('Flow method "' + _path + '" is not a function. Instance:' + module_instance._name);
        return;
    }
    
    return path;
}
