var Link = require('./link');
var Flow = require('./flow');
var utils = require('./utils');
var Instance = require('./instance');

// export event emitter object (clone before use!)
module.exports = {

    /**
     * Call handlers of a specific event or pipe if handler is a stream.
     *
     * @public
     * @param {string} The event name.
     * @param {object} The data for the event handlers.
     */
    emit: function (eventName, transmitter) {
        var instance = this;
        var events = instance._events;
        
        // compare event or test regex
        if (events[eventName]) {
        
            // create eso and emit to flow hanlder
            transmitter = transmitter || utils.clone(Link);
            
            // save origin scope on transmitter
            // ..alwasy overwrite instance ref?
            transmitter._ = this;
            
            // outgoing connections
            transmitter.out = {};
          
            // index for events that must be removed
            var obsoleteEvents = [];

            // call handlers
            for (var i = 0, l = events[eventName].length, event; i < l; ++i) {
                handler = events[eventName][i];
              
                if (handler) {
                    
                    // TODO/CONTINUE: create a new stream and pipe them together (duplex)
                    transmitter.out[eventName] = {};
                    
                    // pass transmitter to flow to setup handlers
                    handler.call(transmitter, handler.data);
                    
                    // remove from event buffer, if once is true
                    if (handler._1) {
                        handler = undefined;
                        obsoleteEvents.push([eventName, i]);
                    }
                }
            }
            
            // remove obsolete events
            this._rm(obsoleteEvents);
        }
        
        // return transmitter to send and receive data
        return transmitter;
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
    on: function (eventName, data, once) {
        
        var events = this._events;
        var handler = Flow;
        handler.data = data;
        
        if (!events[eventName]) {
            events[eventName] = [];
        }
        
        // append module load handler (once)
        if (config.load) {
            
            // create load handler function
            var load_handler = loadModuleInstances;
            
            load_handler.data = data.load;
            
            // load modules only once
            load_handler._1 = 1;
            
            // push load handler before the flow handler
            events[eventName].push(load_handler);
        }

        handler._1 = once;
        events[eventName].push(handler);
    },

    /**
     * Remove an event or a single event hanlder from the event loop.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     */
    off: function (event, handler) {

        var events = this._events;

        if (events[event]) {

            if (handler) {
                var rm = [];

                for (var i = 0; i < events[event].length; ++i) {
                    if (events[event][i] === handler) {
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

// load module instances handler
function loadModuleInstances (moduleInstances) {
    for (var i = 0, l = moduleInstances.length; i < l; ++i) {
        Instance(moduleInstances[i]);
    }
}






