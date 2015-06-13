var Hub = require('./hub');
var Instance = require('./instance');
var Message = require('./message');
var Flow = require('./flow');
var socketReconnectTimeoutId;

// extend engine with event emitter
for (var key in Hub) {
    engine[key] = Hub[key];
}
engine._events = {};

// append load listener
engine.on('load', Flow, {to: ':@', emit: 'load'});

// client flag
engine.client = true;

// data handlers
engine.handlers = {
    transform: require('./transform')
};

/**
 * Empties all caches and reloads the modules.
 *
 * @public
 * @param {boolean} Don't remove the DOM nodes.
 * @todo check for memory leaks
 */
engine.reload = function (keepDom) {
  
    // engine.emit('reload', keepDom);
    
    // close the websocket and reconnect immedialtey
    engine.socket.close(3000);
};

/**
 * Connect to the server and start listening to messages.
 *
 * @public
 */
(function listen (dontLoadEntrypoint) {

    // reset websocket reconnect timer
    if (socketReconnectTimeoutId) {
        clearTimeout(socketReconnectTimeoutId);
        socketReconnectTimeoutId = 0;
    }

    // create the websocket
    var websocket = new WebSocket('ws://' + window.location.host + '/');

    /**
     * Load the entrypoint module instance on socket open.
     *
     * @private
     */
    if (!dontLoadEntrypoint) {
        websocket.onopen = Instance;
    }

    /**
     * Message handler.
     *
     * @private
     * @param {string} The message string.
     */
    websocket.onmessage = function (message) {
      
        // TODO check is message contains ref to websocket
        // TODO clean up websocket ref in socket streams
        Message(message.data, websocket);
    };
    
    /**
     * Close socket on error.
     *
     * @private
     */
    websocket.onerror = function (error) {
        console.error(error);
        websocket.close(4000);
    };
    
    /**
     * Reconnect socket on close.
     *
     * @private
     */
    websocket.onclose = function (closeEvent) {

        // reload imediately, when socket is closed by reload
        if (closeEvent.code === 3000) {
            listen();
            
        // reload imediately without loading entrypoint
        // when an error occured
        } else if (closeEvent.code === 4000) {
            listen(true);

        // every other case, engine tries to reload after ca. 3 seconds
        } else if (!socketReconnectTimeoutId) {
            socketReconnectTimeoutId = setTimeout(function () {
                listen(true);
            }, 3333);
        }
    };
})();
