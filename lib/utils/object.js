
exports.clone = clone;
exports.flat = flat;
exports.deep = deep;
exports.path = path;

// clone objects
function clone (object) {

    // create an empty function
    function ClonedObject() {}

    // set prototype to given object
    ClonedObject.prototype = object;

    // create new instance of empty function
    return new ClonedObject();
}

// create flat paths (dot.notation)
function flat (object) {
    var output = {};
    var value;
    var newKey;

    // recusrive handler
    function step(obj, prev) {
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

// nest flat pahts (dot.notation) inside an object
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

// get a nested value from a flat path (dot.notation)
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
