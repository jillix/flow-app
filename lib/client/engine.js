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

/**
 * Create server module instances
 */
engine.load = function (name, callback) {
    
    // ensure callback
    callback = callback || function () {};
    
    // check instance chache
    if (engine.instances[name]) {
        return callback(null, engine.instances[name]);
    }
    
    // get composition
    engine.flow('C').data(function (err, composition) {
        
        if (err) {
            return callback(err);
        }
        
        // require module
        require(composition.module, function (module) {
            
            if (err) {
                return callback(err);
            }
            
            // create instance
            Instance(module, composition, callback);
        });
    }).write(null, name);
};

/**
 * Empties all caches and reloads the modules.
 *
 * @public
 * @param {boolean} Don't remove the DOM nodes.
 * @todo be aware of memory leaks
 */
engine.reload = function (keepDom) {
    // ..
};

// load entrypoint
engine.load();
