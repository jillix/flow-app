// engine websocket communication
(function (global, body, state) {

    var engine = typeof global === 'undefined' ? E : global.engine;

    // link cache for the engine global
    engine._links = {};

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

        // parse message
        // protocoll: [type, instance, event, id, err data]
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        // get instance
        instance = message[1] === 0 ? engine : engine.modules[message[1]];

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
            link = createLink(event, null, id, websocket);

            // ensure socket on link
            link.socket = link.socket || websocket;

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
                delete instance._links[id];

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

})(this, document, location);
