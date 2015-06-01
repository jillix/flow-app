// export event emitter object (clone before use!)
module.exports = {

    /**
     * Call handlers of a specific event or pipe if handler is a stream.
     *
     * @public
     * @param {string} The event name.
     * @param {object} The data for the event handlers.
     */
    emit: function (eventName, data) {
        var instance = this;
        var events = instance._events;

        // compare event or test regex
        if (events[eventName]) {
          
            // index for events that must be removed
            var obsoleteEvents = [];

            // call handlers
            for (var i = 0, l = events[eventName].length, event; i < l; ++i) {
                handler = events[eventName][i];
              
                if (handler) {

                    // if handler and data are event streams, pipe to the handler
                    if (handler.pipe && data.pipe) {
                        data.pipe(handler);

                    // call registered Methods
                    } else {
                        handler.call(instance, data);
                    }
                    
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
    on: function (eventName, handler, once) {

        var events = this._events;

        // get handler from a path
        if (typeof handler !== 'function' && typeof handler !== 'object') {
            return;
        }

        if (!events[eventName]) {
            events[eventName] = [];
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
    
    
    
    
    
    
    