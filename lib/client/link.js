var engine = typeof global === 'undefined' ? E : global.engine;

// the chache for active links
engine._links = {};

// add create Link to global engine object
engine.link = createLink;

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
    },

    /**
     * Add a data handler, to receive data.
     *
     * @public
     * @param {function} The data handler method.
     */
    data: function (handler) {
        this._h.push(handler);
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
    if (data) {
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

/**
 * Create a connected link.
 *
 * @private
 * @param {object} The link configuration.
 * @param {function} The connection end handler.
 * @param {string} Optional custom link id.
 */
function createLink (event, callOnEnd, id, socket) {

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

    // save in the module instances link cache
    this._links[link.id] = link;

    // return link object
    return link;
}
