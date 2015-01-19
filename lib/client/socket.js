// engine websocket communication
(function (global, body, state) {

    var engine = global.E;

    // link cache for the engine global
    engine._links = {};

    // create the websocket
    var socket = engine.socket = new WebSocket('ws://' + state.host + '/');

    /**
     * Load the entrypoint module instance on socket open.
     *
     * @private
     */
    socket.onopen = function () {
        engine.module();
    };

    /**
     * Message handler.
     *
     * @private
     * @param {string} The message string.
     */
    socket.onmessage = function (message) {

        // parse message
        // protocoll: [type, instance, event, id, err data]
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        // get instance
        var instance = engine.modules[message[1]];

        // ignore if instance doesn't exists
        if (!instance) {
            return;
        }

        // get the link object
        var id = message[3];
        var link = instance._links[id];

        // parse values
        var event = message[2];
        var data = message[5];
        var err = message[4];

        // create link and emit link event
        if (!link) {

            // create a new link with a custom id
            link = engine.link(event, null, id);

            // emit the new crated link
            instance.emit(event, {link: link});
        }

        // handle message types
        switch (message[0]) {

            // END
            case 0:

                // call the end handler
                link._end(err, data);

                // destroy link
                delete instance.links[id];

                break;

            // DATA
            case 1:

                // call data handlers
                if (link._h.length) {
                    for (var i = 0; i < link._h.length; ++i) {
                        link._h.call(link._, err, data);
                    }
                }
        }
    };

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
            delete this._.links[this.id];
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
        engine.socket.send(message);
    }

    /**
     * Create a connected link.
     *
     * @public
     * @param {object} The link configuration.
     * @param {function} The connection end handler.
     * @param {string} Optional custom link id.
     */
    engine.link = function (event, callOnEnd, id) {

        // create link object
        var link = engine.clone(Link);

        // add instance to link
        link._ = this;

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
    };

})(this, document, location);
