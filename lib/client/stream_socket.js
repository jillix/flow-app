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
