var EventEmitter = require('./events');
var Link = require('./link');
var Instance = require('./instance');

// extend engine with event emitter
for (var key in EventEmitter) {
    engine[key] = EventEmitter[key];
}
engine._events = {};

// client flag
engine.client = true;

// link
engine.link = Link;

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








