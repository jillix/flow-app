var engine = typeof E === 'undefined' ? global.engine : E;

// the chache for active links
engine._links = {};

// add create Link to global engine object
engine.link = createLink;
engine.link.message = messageHandler;

/**
 * Send and recive data with the Link class.
 *
 * @class Link
 */
var Link = {

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

        // send message
        send.call(this, 0, err, data);

        // call the end handler
        this._end(err, data);

        // destroy link
        delete this._._links[this.id];
    }
};

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
    var link = engine.clone(Link);

    // add instance to link
    link._ = this;

    // attach socket or get local websocket (only client)
    link.socket = socket || engine.socket;

    // data handlers
    link._h = [],

    // creae a unique link id
    link.id = id || engine.uid(3);

    // attach end callback
    link._end = callOnEnd || function () {};

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
        instance = instance ? engine.module.eventAccess(session[engine.session_role], instance, event) : engine;

    } else {

        // get module instance
        instance = instance ? engine.modules[instance] : engine;
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
        instance.emit(event, link);
    }

    // handle message types
    switch (type) {

        // END
        case 0:

            // call the end handler
            link._end(err, data);

            // destroy link
            delete instance._links[id];

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
function send (type, err, data) {

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
    this.socket.send(message);
}
