var EventEmitter = require('./events');
var Instance = require('./instance');
var Transform = require('./transform');

// extend engine with event emitter
for (var key in EventEmitter) {
    engine[key] = EventEmitter[key];
}
engine._events = {};

// append load listener
engine.on('load', {to: ':@', call: 'load'});

// client flag
engine.client = true;

// data handlers
engine.handlers = {
    transform: Transform
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
    engine.emit('reload', keepDom);
};
