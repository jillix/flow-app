var Hub = require('./hub');
var Instance = require('./instance');

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
