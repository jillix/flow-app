// the global namespace
global.engine = {
    clone: clone,
    flat: flat,
    deep: deep,
    path: path
};

// require dependencies
engine.session = require('./session');
engine.request = require('./request');
engine.socket = require('./socket');
engine.module = require('./module');
engine.cache = require('./cache');
engine.static = require('./static');

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
