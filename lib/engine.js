// dependencies
var EventEmitter = require('events').EventEmitter;
var WebSocketServer = require('ws').Server;
var httpServer = require('http');

// create the global engine object
var engine = global.engine = new EventEmitter();

// static values
engine.operation_identifier = '@';
engine.public_session = '*';
engine.session_role = 'role';
engine.session_locale = 'locale';
engine.session_user = 'user';
engine.http = {
    maxAge: 86400,
    maxAge_fingerprint: 94670000
};

// prototypal inheritance
engine.clone = clone;

// flatten object
engine.flat = flat;

// undlatten object
engine.deep = deep;

// get a value from an object with a dot notation path
engine.path = path;

// generate a random string
engine.uid = uid;

/**
 * Start the HTTP and WebSocket servers.
 *
 * @public
 * @param {string} The absolute path to the repo.
 * @param {number} The port number.
 * @param {string} The user id.
 * @param {string} The API key.
 * @param {boolean} Indicates if engine should run in production mode.
 */
module.exports = function start (repo, port, user, key, production) {

    // save starting parameters
    engine.repo = repo;
    engine.port = port;
    engine.user = user;
    engine.key = key;
    engine.production = production;

    // static paths values
    engine.root = require('path').normalize(__dirname + '/');
    engine.paths = {
        app_repo: repo,
        app_public: repo + 'public/',
        app_markup: repo + 'markup/',
        app_modules: repo + 'modules/',
        app_composition: repo + 'composition/'
    };

    // caches
    engine.cache = require('./cache');

    // require dependencies
    engine.session = require('./session');

    // static files
    engine.static = require('./static');

    // http request handler
    engine.http.request = require('./request');

    // socket connection handler
    require('./client/link');
    engine.socket = {
        connection: require('./socket')
    };

    // module factory
    engine.module = require('./module');

    // create a http server and listen to requests, with the session request handler
    engine.http.server = httpServer.createServer(engine.session);

    // create a websocket server
    engine.socket.server = new WebSocketServer({server: engine.http.server});

    // listen to websocket connections with the session connection handler
    engine.socket.server.on('connection', engine.session);

    // start http server
    engine.http.server.listen(port);
};

/**
 * Clone object. True prototypal inheritance.
 *
 * @public
 * @param {object} The, to be cloned, object.
 */
function clone (object) {

    // create an empty function
    function O() {}

    // set prototype to given object
    O.prototype = object;

    // create new instance of empty function
    return new O();
}

/**
 * Create a flat object {key1: {key2: "value"}} => {"key1.key2": "value"}
 *
 * @public
 * @param {string} The object, which is flattened.
 */
function flat (object) {
    var output = {};
    var value;
    var newKey;

    // recusrive handler
    function step (obj, prev) {
        for (var key in obj) {
            value = obj[key];
            newKey = prev + key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {

                if (Object.keys(value).length) {
                    step(value, newKey + '.');
                    continue;
                }
            }

            output[newKey] = value;
        }
    }

    // start recursive loop
    step(object, '');

    return output;
}

/**
 * Unflatten dot-notation keys {"key1.key2": "value"} => {key1: {key2: "value"}}
 *
 * @public
 * @param {string} The object, which is unflattened.
 */
function deep (object) {
    var result = {};
    var parentObj = result;
    var key;
    var subkeys;
    var subkey;
    var last;
    var keys = Object.keys(object);

    for (var i = 0; i < keys.length; ++i) {

        key = keys[i];
        subkeys = key.split('.');
        last = subkeys.pop();

        for (var ii = 0; ii < subkeys.length; ++ii) {
            subkey = subkeys[ii];
            parentObj[subkey] = typeof parentObj[subkey] === 'undefined' ? {} : parentObj[subkey];
            parentObj = parentObj[subkey];
        }

        parentObj[last] = object[key];
        parentObj = result;
    }

    return result;
}

/**
 * Get a value from a property "path" (dot.notation).
 * path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
 *
 * @public
 * @param {string} The path in "dot" notation.
 * @param {object} The data object, which is used to search the path.
 */
function path (key, scope) {

    if (!path) {
        return;
    }

    var o = key;
    key = key.split('.');
    scope = scope || this;

    // find keys in paths or return
    for (var i = 0; i < key.length; ++i) {
        if (!(scope = scope[key[i]])) {
            return;
        }
    }

    return scope;
}

/**
 * Retruns a random string.
 *
 * @public
 * @param {number} The length of the random string.
 */
function uid (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
}
