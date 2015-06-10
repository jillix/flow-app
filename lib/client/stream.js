var utils = require('./utils');
var wesocketReconnectTimeoutId;

// reset links cache on reload
/*engine.on('reload', function () {
    engine._links = {};
    
    // close the websocket and reconnect immedialtey
    engine.socket.close(3000);
});*/

// link factory
exports.local = localStream;
exports.ws = wsStream;
exports.http = httpStream;

/**
 * Stream like events.
 *
 * @class EventStream
 */
var EventStream = {
    
    // handler for incoming data
    data: function (handler, module_instance) {
        this._i.push([handler, module_instance || this._]);
        return this;
    },
    
    // send data
    write: function (err, data) {
        
        // write to out streams
        for (var o = 0, ol = this._o.length, out; o < ol; ++o) {
          
            // get ouputs input handlers
            out = this._o[o];
            
            // call data handlers with err and data as arguments
            for (var i = 0, l = out.length; i < l; ++i) {
              
                //call data handler with eventStream instance as function scope
                var newData = out[i][0].call(out[i][1], err, data);
                
                // overwrite data with transformed data
                if (newData !== undefined) {
                    data = newData;
                }
            }
        }
        return this;
    },
    
    end: function () {
        // remove refs
        this._ = this._i = this._o = undefined;
    },
    
    // pipe data to an event stream
    pipe: function (eventStream) {
        
        // ..append out stream
        this._o.push(eventStream._i);
        
        return eventStream;
    }
};

var httpLink = {};

/**
 * Send and recive data with the Link class.
 *
 * @class wsLink
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
function localStream (module_instance) {
    
    // create event stream object
    var transmitter = utils.clone(EventStream);
    transmitter._ = module_instance;
    transmitter._h = [];
    transmitter._o = [];
    
    return transmitter;
}

function httpStream () {
    // ..http stream object
}

/**
 * Create a connected link.
 *
 * @public
 * @param {object} The link configuration.
 * @param {function} The connection end handler.
 * @param {string} Optional custom link id.
 */
function wsStream (event, callOnEnd, id, socket, session) {

    // create link object
    var link = utils.clone(wsLink);

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

/**
 * Connect to the server and start listening to messages.
 *
 * @public
 */
function listen () {

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
}
