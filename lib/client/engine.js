var Hub = require('./hub');
var Instance = require('./instance');
var Socket = require('./socket');
var Flow = require('./flow');

// extend engine with event emitter
for (var key in Hub) {
    engine[key] = Hub[key];
}
engine._events = {};

// append load listener
engine.on('load', Flow, {
    call: 'ws://' + window.location.host + '/@/load'
});

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
    Socket.close(3000);
};
