var Stream = require('./stream');
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
    emit: function (eventName, stream) {
        var instance = this;
        var events = instance._events;
        
        // create eso and emit to flow hanlder
        stream = stream || Stream.local(instance);
        
        // save origin scope on stream
        stream._ = this;
        
        // compare event or test regex
        if (events[eventName]) {
          
            // index for events that must be removed
            var obsoleteEvents = [];

            // call handlers
            for (var i = 0, l = events[eventName].length; i < l; ++i) {
                handler = events[eventName][i];
              
                if (handler) {
                    
                    // pass stream to flow to setup handlers
                    handler.fn.call(stream, handler.data);
                    
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
    on: function (eventName, method, data, once) {
        
        var events = this._events;
        var handler = {
            fn: method,
            data: data,
            _1: once
        };
        
        if (!events[eventName]) {
            events[eventName] = [];
        }
        
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
