var Flow = require('./flow');
var Instance = require('./instance');

// client flag
engine.client = true;

// extend engine with flow emitter
engine = Flow(engine);

// listen to core engine events
engine.mind('C', {call: '@/C'}).mind('M', {call: '@/M'});

// data handlers
engine.handlers = {
    transform: require('./transform')
};

// load entrypoint
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
    
    // close the websocket and reconnect immedialtey
    Socket.close(3000);
};
