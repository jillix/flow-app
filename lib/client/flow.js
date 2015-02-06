var engine;
if (typeof E === 'undefined') {
    engine = global.engine;
} else {
    engine = E;
    global = window;
}

// regular expression patterns
var find_tmpl = /\{([\w\.]+)\}/g;
var find_braces = /\{|\}/g;

/**
 * Create a new flow event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
engine.flow = function (module_instance, outConfig, adapter) {

    /**
     * The flow event handler.
     *
     * @public
     * @param {object} The event object.
     * @param {object} The event data.
     */
    return function handler (event, _data) {

        // create an event object
        event = event || {};
        event.ori = event.ori || module_instance._name;

        // plug external events
        adapter && adapter.handler(event, adapter.data);

        // extend event with location data (hash, search, path)
        global.location && handleStateValues(event);

        // loop through out configs
        for (var i = 0, config, to; i < outConfig.length; ++i) {
            config = outConfig[i];

            // check if "to" module instance exists and role has access
            if (
                (config.to && !(module_instance = engine.modules[config.to])) ||
                (event.role && !engine.roleAccess(module_instance, event.role))
            ) {
                continue;
            };

            // check if event loads module instnaces
            if (config.load) {

                // load module instances
                for (var l = 0; l < config.load.length; ++l) {
                    engine.module(config.load[l])
                }

                // remove load config, after module instances are loaded
                delete config.load;
            }

            // copy the static data or create a new data object
            var data = config.data ? JSON.parse(JSON.stringify(config.data)) : {};

            // merge argument data to data object
            if (_data) {
                for (var key in _data) {
                    data[key] = _data[key];
                }
            }

            // merge static and dynamic data
            data = handleDataMerging(config, event, data, module_instance);

            // emit route
            if (config.route) {
                engine.route(parsePath(config.route, event, data, module_instance), event);
            }

            // emit event
            if (config.emit) {
                module_instance.emit(config.emit, event, data);
            }

            // call method
            if (config.call) {

                // find call method when the event handler is called
                if (typeof config.call === 'string') {
                    config.call = engine.path(config.call, [module_instance]) || function () {};
                }

                // call method
                config.call.call(module_instance, event, data);
            }
        }
    };
}

/**
 * Extend event object with location data.
 *
 * @private
 * @param {object} The event object.
 */
function handleStateValues (event) {

    // add pathname to data object
    event._path = global.location.pathname.substr(1).split('/');

    // parse and append url search to data
    if (global.location.search && !event._search) {
        event._search = searchToJSON();
    }

    // append url hash to data
    if (global.location.hash && !event._hash) {
        event._hash = global.location.hash.substr(1);
    }
}

/**
 * Merge dynamic data to the event data object.
 *
 * @private
 * @param {object} The module instance.
 * @param {object} The event config.
 * @param {object} The event data object.
 */
function handleDataMerging (config, event, data, module_instance) {

    // add dynamic data to the data object
    if (config.set) {

        // add data to the data object
        for (var key in config.set) {

            // parse path
            var path = config.set[key];

            // get an attribute value from a dom element or the element itself
            if (path[0] === '$') {
                path = path.substr(1).split(':');

                // get find an element in the document
                path[0] = document.querySelector(path[0]);

                // set data key to the dom attribute value or the dom element
                data[key] = path[1] && path[0][path[1]] !== undefined ? path[0][path[1]] : path[0];

            // get search value with a path: 1. events, 2. data, 3. instance, 4. window
            } else {
                data[key] = engine.path(path, [event, data, module_instance]);
            }
        }

        // create deep object out of flat keys
        data = engine.deep(data);
    }

    return data;
}

/**
 * Replace data fields in a string.
 *
 * @private
 * @param {string} The string.
 * @param {object} The data context.
 */
function parsePath (path, event, data, module_instance) {
    var match = path.match(find_tmpl);

    // replace route with data
    if (match) {
        for (var i = 0, value; i < match.length; ++i) {

            // get value from object
            value = engine.path(match[i].replace(find_braces, ''), [event, data, module_instance]);

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
