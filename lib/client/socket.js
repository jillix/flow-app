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
        engine.link.message(message.data, websocket);
    };

})(this, document, location);
