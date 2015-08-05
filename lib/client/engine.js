var Flow = require('./flow');
var Instance = require('./instance');

// client flag
engine.client = true;
engine._name

// extend engine with flow emitter
engine = Flow(engine);

// extend engine with logging methods
engine.log = require('./logs') || function (err) {return err};

// listen to core engine events
engine.mind([
    'C',
    ['link', '@/C']
]).mind([
    'M',
    ['link', '@/M']
]);

/**
 * Create server module instances
 */
engine.load = function (name, role, callback, loaderInstance) {

    // ensure callback
    callback = callback || function () {};

    // check instance chache
    if (engine.instances[name]) {
        return callback(null, engine.instances[name]);
    }

    // get composition
    engine.flow('C', null, true).error(function (err, stream) {

        stream.end();
        callback(engine.log('E', err));

    }).data(function (composition, stream) {

        // require module
        require(composition.module, function (module) {

            // create instance
            Instance(module, composition, role, callback, loaderInstance);
        });

        stream.end();

    }).write(null, name);
};

/**
 * Empties all caches and reloads the modules.
 *
 * @public
 * @param {boolean} Don't remove the DOM nodes.
 * @todo be aware of memory leaks
 */
engine.reload = function () {

    for (var i = 0, l = engine._r.length; i < l; ++i) {
        engine._r[i]();
    }

    return engine.load();
};

// load entrypoint
engine.load();
