var wesocketReconnectTimeoutId;

// the chache for active links
engine._links = {};

// add create Link to global engine object
engine.link = createLink;
engine.link.message = messageHandler;

// reset links cache on reload
engine.on('reload', function () {
    engine._links = {};
    
    // close the websocket and reconnect immedialtey
    engine.socket.close(3000);
});

/**
 * Connect to the server and start listening to messages.
 *
 * @public
 */
engine.listen = function () {

    // reset websocket reconnect timer
    if (wesocketReconnectTimeoutId) {
        clearTimeout(wesocketReconnectTimeoutId);
        wesocketReconnectTimeoutId = 0;
    }

    // dont load entrypoint module instance if socket tries to reconnect
    var loadModule = engine.socket ? false : true;

    // create the websocket
    var websocket = engine.socket = new WebSocket('ws://' + window.location.host + '/');

    /**
     * Load the entrypoint module instance on socket open.
     *
     * @private
     */
    websocket.onopen = function () {
        engine.module();
    };

    /**
     * Message handler.
     *
     * @private
     * @param {string} The message string.
     */
    websocket.onmessage = function (message) {
        engine.link.message(message.data, websocket);
    };

    /**
     * Reconnect socket on close.
     *
     * @private
     */
    websocket.onclose = function (closeEvent) {

        // reload imemdiately, when socket is closed by reload
        if (closeEvent.code === 3000) {
            engine.listen();

        // every other case, engine tries to realod after ca. 3 seconds
        } else {
            wesocketReconnectTimeoutId = setTimeout(engine.listen, 3333);
        }
    };
};

var httpLink = {};

/**
 * Send and recive data with the Link class.
 *
 * @class EventStream
 */
var localLink = {

    /**
     * Send a data message over the link.
     *
     * @public
     * @param {object} The error data.
     * @param {object} The data object.
     */
    emit: function (err, data) {

        // call data handlers with err and data as arguments
        for (var i = 0, l = this._h.length; i < l; ++i) {
            //call data handler with eventStream instance as function scope
            this._h[i][0].call(this._h[i][1], err, data);
        }
        return this;
    },

    /**
     * Add a data handler, to receive data.
     *
     * @public
     * @param {function} The data handler method.
     */
    data: function (handler, module_instance) {
        this._h.push([handler, module_instance || this._mi]);
        return this;
    },
    
    // pipe data to an event stream
    pipe: function (eventStream) {
        var self = this;
        self.data(function (err, data) {
            eventStream.emit(err, data);
        });
    }
};

/**
 * Send and recive data with the Link class.
 *
 * @class Link
 */
var wsLink = {

    /**
     * Send a data message over the link.
     *
     * @public
     * @param {object} The error data.
     * @param {object} The data object.
     */
    send: function (err, data) {

        // send message
        send.call(this, 1, err, data);
        return this;
    },

    /**
     * Add a data handler, to receive data.
     *
     * @public
     * @param {function} The data handler method.
     */
    data: function (handler) {
        this._h.push(handler);
        return this;
    },

    /**
     * Destroy the link with an error or data.
     *
     * @public
     * @param {object} The error data.
     * @param {object} The data object.
     */
    end: function (err, data) {
        var self = this;
        
        // send end message, before ending the link
        send.call(self, 0, err, data, function (error) {
            end(self, error || err, data);
        });
    }
};

// event stream factory
function createTransmitter (neuron) {
    
    // create event stream object
    var transmitter = engine.clone(Transmitter);
    transmitter._n = neuron;
    transmitter._h = [];
    
    return transmitter;
}

/**
 * Emit an event.
 *
 * @public
 * @param {object|string} The even name or object, which is emitted.
 * @param {mixed} The following arguments are passed to the event handlers.
 */
function link (name, to) {

    var instance = this;
    var transmitter;
    
    // emit to all local instances
    if (typeof to === 'boolean') {
        instance = null;
    }
    
    // emit to local or server instance
    if (typeof to === 'string') {
      
        // get correct link type
        
        // type ws
        // type http
        
        // type local
        if (!(instance = engine.instances[name.to])) {
            return;
        }
        
        // create local transmitter
        transmitter = createTransmitter(instance);
    }
    
    // fire events on a single instance
    if (instance) {
        instance.emit(name, transmitter);
    
    // fire events on all instances
    } else {
        for (instance in engine.instances) {
            engine.instances[instance].emit(name, transmitter);
        }
    }
    
    return transmitter;
}

/**
 * Create a connected link.
 *
 * @public
 * @param {object} The link configuration.
 * @param {function} The connection end handler.
 * @param {string} Optional custom link id.
 */
function createLink (event, callOnEnd, id, socket, session) {

    // create link object
    var link = engine.clone(wsLink);

    // add instance to link
    link._ = this;

    // attach socket or get local websocket (only client)
    link.socket = socket || engine.socket;

    // data handlers
    link._h = [],

    // creae a unique link id
    link.id = id || engine.uid(3);

    // attach end callback
    link._end = callOnEnd;

    // save link event
    link.event = event;

    // save session data in link
    if (session) {
        link.session = session;
        link[engine.session_role] = session[engine.session_role];
        link[engine.session_user] = session[engine.session_user];
        link[engine.session_locale] = session[engine.session_locale];
    }

    // save in the module instances link cache
    this._links[link.id] = link;

    // return link object
    return link;
}

/**
 * Handle websocket messages.
 *
 * @public
 * @param {sring} The message data.
 * @param {object} The websocket.
 * @param {object} The session object.
 */
function messageHandler (message, websocket, session) {

    // parse message
    // protocoll: [type, instance, event, id, err, data]
    try {
        message = JSON.parse(message);
    } catch (error) {
        return;
    }
    
    // extract data from parsed message
    var type = message[0];
    var instance = message[1];
    var event = message[2];
    var id = message[3];
    var err = message[4];
    var data = message[5];
    
    if (engine.module.eventAccess) {

        // get module instance
        instance = engine.module.eventAccess(session[engine.session_role], instance ? instance : '@', event);

    } else {

        // get module instance
        instance = instance ? engine.instances[instance] : engine;
    }

    // return if instance doesn't exists
    if (!instance) {
        return;
    }

    // get the link object
    var link = instance._links[id];

    // create link and emit link event
    if (!link) {

        // create a new link with a custom id
        link = createLink.call(instance, event, null, id, websocket, session);

        // ensure socket on link
        link.socket = link.socket || websocket;

        // emit the new crated link
        if (instance.emit) {
            instance.emit(event, link);
        } else {
            instance.event(event).emit(link);
        }
    }

    // handle message types
    switch (type) {

        // END
        case 0:
            end(link, err, data);
            break;

        // DATA
        case 1:

            // call data handlers
            if (link._h.length) {
                for (var i = 0; i < link._h.length; ++i) {
                    link._h[i].call(link._, err, data);
                }
            }
    }
}

/**
 * Create and send a websocket message.send
 *
 * @private
 * @param {number} The message type.
 * @param {object} The error object.
 * @param {object} The data object.
 */
function send (type, err, data, ack) {

    // create message
    var message = [type, this._._name || 0, this.event, this.id, err ? err.toString() : 0];

    // add the data to the message
    if (typeof data !== 'undefined') {
        message[5] = data;
    }

    // encode message (string)
    try {
        message = JSON.stringify(message);

    // return error
    } catch (err) {
        return err;
    }

    // send message
    this.socket.send(message, ack);
    
    // call the acknowledge handler
    if (engine.client && ack) {
        ack();
    }
}

/**
 * Destroy a link
 *
 * @private
 * @param {object} The module instance.
 * @param {object} The link object.
 */
function end (link, err, data) {

    // call the end handler
    link._end && link._end(err, data);
    
    // destroy link
    delete link._._links[link.id];
}






