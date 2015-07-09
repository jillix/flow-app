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
engine.load = function (name, role, callback, isDep) {

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
            Instance(module, composition, role, callback, isDep);
        });
    }).write(null, name);
};

// load entrypoint
engine.load();

/**
 * Empties all caches and reloads the modules.
 *
 * @public
 * @param {boolean} Don't remove the DOM nodes.
 * @todo be aware of memory leaks
 */
engine.reload = function (keepDom) {

    //reset instances cache
    engine.instances = {};

    // close all websockets
    for (var socket in engine.sockets) {
        engine.sockets[socket].close(3000);
    }
    engine.sockets = {};

    // reset DOM body
    if (!keepDom) {
        document.body.innerHTML = '';
    }
};
