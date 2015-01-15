// observer module
(function (global, body, state) {

    var engine = global.E;

    /**
     * Make an object observable.
     *
     * @public
     *
     * @param {object} The object, which is extended with the observable methods.
     */
    engine.observer = function (object) {

        // emit event
        object.emit = emit;

        // listen to events
        object.on = on;

        // remove events or listeners
        object.off = off;

        return object;
    };

    /**
     * Emit an event.
     *
     * @public
     *
     * @param {object|string} The even name or object, which is emitted.
     * @param {mixed} The following arguments are passed to the event handlers.
     */
    function emit (event) {

        var self = this;
        var all;
        // index for events that must be removed
        var rm = [];

        // handle emit
        if (typeof event === 'object') {

            // get new scope
            if (event.to) {
                self = cache.I[event.to];
                if (!self) {
                    return;
                }
            }

            // TODO handle the "emit on all instances" case
            all = event.all;

            // set event as event name
            event = event.event;
        }

        var events = self._events;

        // slice first argument
        var args = arguments.length > 1 ? self._toArray(arguments).slice(1) : [];

        for (var _event in events) {

            // compare event or test regex
            if (_event === event || events[_event].re.test(event)) {

                // call handlers
                for (var i = 0; i < events[_event].length; ++i) {
                    if (events[_event][i]) {

                        // call registered Methods
                        events[_event][i].apply(self, args);

                        // remove from event buffer, if once is true
                        if (events[_event][i]._1) {
                            events[_event][i] = null;
                            rm.push([_event, i]);
                        }
                    }
                }

                // routes on the same instance are unique, this prevents
                // regexp overlapping on complicated routes
                if (args[0] && args[0]._rt && !events[_event].nr) {
                    break;
                }
            }
        }

        // remove unused events
        remove(events, rm);
    }

    /**
     * Liten on an event.
     *
     * @public
     *
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     * @param {boolean} Event handler is removed after calling.
     * @param {boolean} If an event is emitted from the route method, the event
     *                  loop stops, when an event is found. This argument tells the
     *                  event loop to continue.
     */
    function on (event, handler, once, noRoute) {
        var self = this;
        var events = self._events = self._events || {};

        // get handler from a path
        if (typeof handler !== fn) {
            handler = self._path(handler);
        }

        if (typeof handler === fn) {

            if (!events[event]) {
                events[event] = [];

                // create regexp pattern
                events[event].re = new RegExp(event);
                events[event].nr = noRoute;
            }

            handler._1 = once;
            events[event].push(handler);
        }
    }

    /**
     * Remove an event or a single event hanlder from the event loop.
     *
     * @public
     *
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     */
    function off (event, handler) {
        var events = this._events;

        if (events[event]) {

            if (handler) {
                var rm = [];

                for (var i = 0; i < events[event].length; ++i) {
                    if (events[event][i] === handler) {
                        events[event][i] = null;
                        rm.push([event, i]);
                    }
                }

                remove(events, rm);

            } else {
                delete events[event];
            }
        }
    }

    /**
     * Removes the collected events from an observable.
     *
     * @private
     *
     * @param {object} The events of an observable.
     * @param {array} The infos for removing events.
     */
    function remove (events, rmObject) {

        if (rmObject.length) {
            for (i = 0; i < rmObject.length; ++i) {

                // remove handler
                events[rmObject[i][0]].splice(rmObject[i][0], 1);

                // remove event
                if (events[rmObject[i][0]].length === 0) {
                    delete events[rmObject[i][0]];
                }
            }
        }
    }

    // make engine an observer
    engine.observer(engine);

// pass environment
})(this, document, location);