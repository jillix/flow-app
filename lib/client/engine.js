var Hub = require('./hub');
var Instance = require('./instance');
var wesocketReconnectTimeoutId;

// extend engine with event emitter
for (var key in Hub) {
    engine[key] = Hub[key];
}
engine._events = {};

// append load listener
engine.on('load', {to: ':@', call: 'load'});

// client flag
engine.client = true;

// data handlers
engine.handlers = {
    transform: require('./transform')
};

Instance();

/**
 * Empties all caches and reloads the modules.
 *
 * @public
 * @param {boolean} Don't remove the DOM nodes.
 * @todo check for memory leaks
 */
engine.reload = function (keepDom) {
    // engine.emit('reload', keepDom);
};

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
