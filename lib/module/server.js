// TODO create server side core module

function loadModule (name, callback) {
    callback(null, require(name));
}

/*
// create the global engine object
var engine = global.engine = Flow();
engine._r = [];
engine.reload = function () {};

// set public role
engine._roles = {
    '*': true
};

engine.paths = {
    'public': global.pkg.repository.local + 'public/',
    'markup': global.pkg.repository.local + 'markup/',
    'composition': global.pkg.repository.local + 'composition/'
}

// extend engine with logging methods
engine.log = require('./client/logs');

// create flow emitter out of engine
//engine = Flow(engine);

// core http resouce event interface
engine._flow = {

    // TODO load html snippted over websocket, until html imports are supported
    'M': [[Static.markup]],

    'E': [[Static.client]],

    // fetch a composition config
    'C': [[Static.composition]],

    'IC': [[Instance.cache]],
    'I': [[
        Composition,
        Instance.build
    ]],
};
*/