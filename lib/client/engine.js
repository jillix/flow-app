E('engine', function (require, module, exports, global, engine) {
    
    // client flag
    engine.client = true;
    
    var EventEmitter = require('EventEmitter');
    
    // extend engine with event emitter
    for (var key in EventEmitter) {
        engine[key] = EventEmitter[key];
    }
    engine._events = {};
    
    var InstaceLoader = require('InstanceLoader');
    
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
});






