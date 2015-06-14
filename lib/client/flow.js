var Stream = require('./stream');
var Socket = require('./socket');
var utils = require('./utils');

// export event emitter object (clone before use!)
module.exports = {

    /**
     * Call handlers of a specific event or pipe if handler is a stream.
     *
     * @public
     * @param {string} The event name.
     * @param {object} The data for the event handlers.
     */
    emit: function (eventName, stream, context) {
        var events = this._events;
        
        context = context || {};
        
        // create eso and emit to flow hanlder
        stream = stream || Stream(this);
        
        // compare event or test regex
        if (events[eventName]) {
          
            // index for events that must be removed
            var obsoleteEvents = [];

            // call handlers
            for (var i = 0, l = events[eventName].length; i < l; ++i) {
                config = events[eventName][i];
              
                if (config) {
                    
                    // pass stream to flow to setup handlers
                    Flow.call(this, stream, config, context);
                    
                    // remove from event buffer, if once is true
                    if (config['1']) {
                        config = undefined;
                        obsoleteEvents.push([eventName, i]);
                    }
                }
            }
            
            // remove obsolete events
            this._rm(obsoleteEvents);
        }
        
        // return transmitter to send and receive data
        return stream;
    },

    /**
     * Listen on an event.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     * @param {boolean} Event handler is removed after calling.
     * @param {boolean} If an event is emitted from the route method, the event
     *                  loop stops, when an event is found. This argument tells the
     *                  event loop to continue.
     */
    on: function (eventName, config) {
        
        var events = this._events;
        
        if (!events[eventName]) {
            events[eventName] = [];
        }
        
        events[eventName].push(config);
    },

    /**
     * Remove an event or a single event hanlder from the event loop.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     */
    off: function (event, config) {

        var events = this._events;

        if (events[event]) {

            if (config) {
                var rm = [];
                
                // TODO config is an object, how to compare?
                for (var i = 0; i < events[event].length; ++i) {
                    if (events[event][i] === config) {
                        events[event][i] = undefined;
                        rm.push([event, i]);
                    }
                }

                this._rm(rm);

            } else {
                delete events[event];
            }
        }
    },
    
    /**
     * Removes the collected events from an observable.
     *
     * @private
     * @param {object} The events of an observable.
     * @param {array} The infos for removing events.
     */
    _rm: function (rmObject) {

        if (rmObject.length) {
            var events = this._events;
            for (var i = 0, l = rmObject.length; i < l; ++i) {
                
                // remove handler
                events[rmObject[i][0]].splice(rmObject[i][1], 1);

                // remove event
                if (events[rmObject[i][0]].length === 0) {
                    delete events[rmObject[i][0]];
                }
            }
        }
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
function Flow (originStream, flow, context, adapter) {
    var module_instance = this;
    
    // handle "to" config
    if (typeof flow.to === 'string') {
      
        // get target module instance, or continue if not found
        // and check module instance acces for server side
        if (
            (!(module_instance = engine.instances[flow.to])) ||
            (
                originStream[engine.session_role] &&
                !utils.roleAccess(
                    module_instance,
                    originStream[engine.session_role]
                )
            )
        ) {
            return console.error('Flow target instance "' + flow.to + '" is not found.');
        }
    }
    
    // create individual stream
    var stream = Stream(module_instance);
    
    // pipe to origin stream after transform
    stream.pipe(originStream).pipe(stream);
    
    // add data handler to transmitter
    if (
        flow.data instanceof Array &&
        (flow.data[0] = getMethodFromPath(flow.data[0], module_instance))
    ) {
        stream.data(flow.data[0], flow.data[1]);
    }

    // emit transmitter to other flow handlers
    if (typeof flow.emit === 'string') {
        module_instance.emit(flow.emit, stream, context);
    }

    // pass stream to receiver function
    if (flow.call) {

        // call event over network
        if (typeof flow.call === 'string' && flow.call.indexOf('/') > -1) {
            Socket.send.call(module_instance, flow.call);
        
        // call local method
        } else if ((flow.call = getMethodFromPath(flow.call, module_instance))) {
            flow.call.call(module_instance, stream, context, flow);
        }
    }
}

/**
 * Return a function or undefined.
 */
function getMethodFromPath (path, module_instance) {
  
    var _path;

    if (
        typeof path === 'string' &&
        typeof (_path = utils.path(path, [engine.handlers, module_instance, global])) !== 'function'
    ) {
        console.error('Flow method is not a function. Value for "' + path + '" is:', _path);
        return;
    }

    if (typeof path === 'function') {
        return path;
    }
}
