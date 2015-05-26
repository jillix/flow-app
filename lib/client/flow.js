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
engine.flow = function (_module_instance, flows, adapter) {

    /**
     * The flow event handler.
     *
     * @public
     * @param {object} The event object.
     * @param {object} The event data.
     */
    return function handler (eventStream) {

        // create the data object, that is emitted as first data event
        var data = {};

        // extend data with location data (hash, search, path)
        if (global.location) {
            handleStateValues(data);
        }

        // add custom data to the first data emit
        if (adapter) {
            adapter.handler(data, adapter.data);
        }

        // execute the flow configs
        for (var i = 0, l = flows.length, flow, key; i < l; ++i) {

            // reslove data fields and clone the flow config object
            flow = resolveAndClone(flows[i], data, module_instance);

            // get target module instance, or continue if not found
            // and check module instance acces for server side
            if (
                (flow.to && !(module_instance = engine.instances[parsePath(flow.to, data, module_instance)])) &&
                (eventStream.role && !engine.roleAccess(module_instance, eventStream.role))
            ) {
                continue;
            }

            /*
            TODO: - pipe to "serverEvent:instance"
            */
            if (flow.to && flow.to.indexOf(':') > 0) {
                var serverEvent = flow.to.split(':')[0];

                var link = module_instance.link(serverEvent, function () {
                    //..
                });

                // ..pipe link to eventStream?
                // ..send flow config as data to server?
            }

            // search for call method in resolved path
            if (typeof flow.call === 'string') {
                flow.call = getPathValue(flow.call, data, module_instance);
            }

            // load module instances
            if (flow.load) {
                // load module instances
                for (var m = 0, ml = flow.load.length; ml < m; ++m) {
                    engine.module(flow.load[m]);
                }
            }

            // pipe event to another event
            if (flow.pipe) {
                eventStream.pipe(module_instance.event(flow.pipe));
            }

            // route to url
            if (flow.route) {
                engine.route(flow.route);
            }

            // append method call event data handlers
            if (flow.call) {
                // module_instance as this?
                eventStream.data(module_instance, flow.call);
            }
        }

        // send first data event with the configured flow data
        eventStream.emit(null, data);
    };
};

/**
 * Extend event object with location data.
 *
 * @private
 * @param {object} The event object.
 */
function handleStateValues (data) {

    // add pathname to data object
    data._path = global.location.pathname.substr(1).split('/');

    // parse and append url search to data
    if (global.location.search && !data._search) {
        data._search = searchToJSON(global.location.search);
    }

    // append url hash to data
    if (global.location.hash && !data._hash) {
        data._hash = global.location.hash.substr(1);
    }
}

/**
 * Parse a state search string to JSON.
 * Credentials: http://snipplr.com/view/70905/search-string-to-json/
 *
 * @private
 */
function searchToJSON(search) {
    var rep = {'?':'{"','=':'":"','&':'","'};
    var s = search.replace(/[\?\=\&]/g, function(r) {
        return rep[r];
    });
    return JSON.parse(s.length? s+'"}' : "{}");
}

/**
 * Resolve data fields in flow config.
 *
 * @private
 * @param {object} The flow config.
 * @param {object} The data object.
 * @param {object} The module instance.
 */
function resolveAndClone (flow, data, module_instance) {

    var parsedFlow = {};

    for (var option in flow) {

        // parse and clone load config
        if (option === 'load') {

            /*
                "load": ["{instance}"]
            */

            parsedFlow[option] = [];
            for (var i = 0, l = flow[option].length; i < l; ++i) {
                parsedFlow[option][i] = parsePath(flow[option][i], data, module_instance);
            }

            continue;
        }

        if (option === 'data' || option === 'set') {

            /*
                "data": {
                    "key": "{value}"
                },
                "set": {
                    "key": "{path}",
                    "key": "${#css:attr}"
                }
            */

            // parse and clone pipe config
            for (var key in flow[option]) {
                parsedFlow[option] = {};

                // parse the data field values
                parsedFlow[option][key] = parsePath(flow[option][key], data, module_instance);

                // search for path in data and module instance and set it to the cloned flow
                if (option === 'set') {
                    parsedFlow[option][key] = getPathValue(parsedFlow[option][key], data, module_instance);
                }
            }

            // create deep object out of flat keys
            parsedFlow[option] = engine.deep(parsedFlow[option]);

            continue;
        }

        /*
            "pipe": "{event}",
            "call": "{method}",
            "route": "{path}",
            "to": {instance}
        */

        parsedFlow[option] = parsePath(flow[option], data, module_instance);
    }
}

/**
 * Replace data fields in a string.
 *
 * @private
 * @param {string} The string.
 * @param {object} The data context.
 */
function parsePath (path, data, module_instance) {

    if (path.indexOf('{') < 0) {
        return path;
    }

    var match = path.match(find_tmpl);

    // replace route with data
    if (match) {
        for (var i = 0, value; i < match.length; ++i) {

            // get value from object
            value = engine.path(match[i].replace(find_braces, ''), [data, module_instance]);

            // replace value in route
            if (typeof value !== 'undefined') {
                path = typeof value === 'object' ? value : path.replace(match[i], value);
            }
        }
    }

    return path;
}

/**
 * Merge dynamic data to the event data object.
 *
 * @private
 * @param {object} The module instance.
 * @param {object} The event config.
 * @param {object} The event data object.
 */
function getPathValue (path, data, module_instance) {

    // get an attribute value from a dom element or the element itself
    if (path[0] === '$') {
        path = path.substr(1).split(':');

        // get find an element in the document
        path[0] = document.querySelector(path[0]);

        // set data key to the dom attribute value or the dom element
        return path[1] && path[0][path[1]] !== undefined ? path[0][path[1]] : path[0];

    }

    // return search value with a path: 1. data, 3. instance, 4. global
    return engine.path(path, [data, module_instance, global]);
}






