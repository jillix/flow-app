// engine starting point
(function (global, body, state) {

    // check browser features and route to a "update your browser site"
    if (!global.WebSocket || !global.history) {
        global.location = 'http://browsehappy.com/';
        return;
    }

    // listen on state change (popstate) and emit the new route state
    global.addEventListener('popstate', function () {
        engine.route('', {}, true);
    }, false);

    // regular expression patterns
    var find_tmpl = /{([\w\.]+)}/g;
    var find_braces = /\{|\}/g;

    /**
     * Wrapper function for CommonJS modules.
     *
     * @public
     * @param {string} The complete file path.
     * @param {function} The wrapper function, which returns the module object
     */
    var engine = function Engine (path, module) {
        modules[path] = module;
        engine.emit(path);
    };

    /**
     * Clone object. True prototypal inheritance.
     *
     * @public
     *
     * @param {object} The, to be cloned, object.
     */
    engine.clone = function (object) {
        var O = function() {};
        O.prototype = object || {};
        return new O();
    };

    /**
     * Get a value from a property "path"
     * this._path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
     *
     * @public
     * @param {string} The path in "dot" notation.
     * @param {object} The data object, which is used to search the path.
     * @param {booloean} Stop search, or try to search in the global.
     */
    engine.path = function (path, scope, stop) {

        if (!path) {
            return;
        }

        var o = path;
        path = path.split('.');
        scope = scope || this;

        // find keys in paths or return
        for (var i = 0; i < path.length; ++i) {
            if (!(scope = scope[path[i]])) {
                return stop ? null : this._path(o, win, true);
            }
        }

        return scope;
    };

    /**
     * Create a flat object {key1: {key2: "value"}} => {"key1.key2": "value"}
     *
     * @public
     * @param {string} The object, which is flattened.
     */
    engine.flat = function (object) {
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
    };

    /**
     * Unflatten dot-notation keys {"key1.key2": "value"} => {key1: {key2: "value"}}
     *
     * @public
     * @param {string} The object, which is unflattened.
     */
    engine.deep = function (object) {
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
    };

    /**
     * Convert array like object into real Arrays.
     *
     * @public
     * @param {object} The object, which is converted to an array.
     */
    engine.toArray = function (object) {
        return Array.prototype.slice.call(object);
    };

    /**
     * Retruns a random string.
     *
     * @public
     * @param {number} The length of the random string.
     */
    engine.uid = function (len) {
        len = len || 23;
        for (var i = 0, random = ''; i < len; ++i) {
            random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
        }
        return random;
    };

    /**
     * Emties all caches and reloads the modules.
     *
     * @public
     * @param {boolean} Don't remove the DOM nodes.
     * @todo check for memory leaks
     */
    engine.reload = function (keepDom) {

        // reset module cache
        engine.modules = {};

        // reset websockets callback cache
        //activeLinks = {};

        // reset html
        if (!keepDom) {
            body.body.innerHTML = '';
        }

        // load entrypoint instance for this domain
        engine.module();
    };

    /**
     * Replace data fields in a string.
     *
     * @private
     * @param {string} The string.
     * @param {object} The data context.
     */
    function parsePath (path, event) {
        var self = this;
        var match = path.match(find_tmpl);

        // replace route with data
        if (match) {
            for (var i = 0, value; i < match.length; ++i) {

                // get value from object
                value = self._path(match[i].replace(find_braces, ''), event);

                // replace value in route
                if (typeof value !== 'undefined') {
                    path = path.replace(match[i], value);
                }
            }
        }

        return path;
    }

    /**
     * Parse a state search string to JSON.
     * Credentials: http://snipplr.com/view/70905/search-string-to-json/
     *
     * @private
     */
    function searchToJSON(){
        var rep = {'?':'{"','=':'":"','&':'","'};
        var s = state.search.replace(/[\?\=\&]/g, function(r) {
            return rep[r];
        });
        return JSON.parse(s.length? s+'"}' : "{}");
    }

    // attach engine to the global object
    global.E = engine;

// pass environment
})(this, document, location);
