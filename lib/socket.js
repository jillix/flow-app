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
        engine.link.message(message, websocket, session);
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
