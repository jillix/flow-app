/**
 * Handle websocket connections.
 *
 * @public
 * @param {object} The session object.
 * @param {object} The connected websocket.
 */
module.exports = function handler (session, websocket) {

    /**
     * Handle websocket message.
     *
     * @private
     * @param {sring} The message data.
     */
    websocket.on('message', function (message) {

        // parse message
        // protocoll: [type, instance, event, id, err data]
        try {
            message = JSON.parse(message);
        } catch (error) {
            return;
        }

        // get role from session
        var role = session[engine.session_role];

        // event name
        var event = message[2];

        // get module instance or the core module (engine)
        var instance = message[1] === 0 && event === 'load' ? engine : engine.module.access(role, message[1], event);

        // ignore if instance doesn't exists
        if (!instance) {
            return;
        }

        // get the link object
        var id = message[3];
        var link = instance._links[id];

        // data and error
        var data = message[5];
        var err = message[4];

        // create link and emit link event
        if (!link) {

            // create a new link with a custom id
            link = engine.link.call(instance, event, null, id, websocket);
            link.session = session;

            // save session in event
            link[engine.session_role] = role;
            link[engine.session_user] = session[engine.session_role];
            link[engine.session_locale] = session[engine.session_locale];

            // ensure socket on link
            link.socket = link.socket || websocket;

            // emit the new crated link
            instance.emit(event, link);
        }

        // ensure socket on link
        link.socket = link.socket || websocket;

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
                        link._h[i].call(link._, err, data);
                    }
                }
        }
    });
};

/*
// broadcast message to all connected sockets
function broadcast (event, err, data) {
    var self = this;

    data = createMessage(self._._name, event, err, data);

    // broadcast
    for (var i = 0, l = WS.clients.length; i < l; ++i) {
        WS.clients[i].send(data);
    }
}
*/
