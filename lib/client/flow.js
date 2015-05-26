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
        
        // execute the flow configs
        for (var i = 0, l = flows.length, flow; i < l; ++i) {
            flow = flows[i];
            
            /*
            TODO: - static and dynamic data
                  - parse config values {route}, {method}, etc..
                  - pipe "http:instance" and "ws:instance" to config to link
            */
            
            // check if "to" module instance exists and role has access
            /*if (
                (config.to && !(module_instance = engine.instances[config.to])) ||
                (event.role && !engine.roleAccess(module_instance, event.role))
            ) {
                continue;
            }*/
            
            // load module instances
            if (flow.load) {
                // load module instances
                for (var m = 0, ml = flow.load.length; ml < m; ++m) {
                    engine.module(flow.load[m]);
                }

                // remove load config, after module instances are loaded
                delete flow.load;
            }
            
            // pipe event to another event
            if (flow.pipe) {
                eventStream.pipe(module_instance.emit(flow.pipe));
            }
            
            // route to url
            if (flow.route) {
                engine.route(flow.route);
            }
            
            // append method call event data handlers
            if (flow.call) {
            
                // find call method when the event handler is called
                if (typeof flow.call === 'string') {
                    flow.call = engine.path(flow.call, [module_instance, global]);
                }
                
                // call method
                if (flow.call) {
                    // module_instance as this?
                    eventStream.data(module_instance, flow.call);
                }
            }
        }
        
        // copy the static data or create a new data object
        var data = config.data ? JSON.parse(JSON.stringify(config.data)) : {};
        
        /*
        // complete dynamic paths
        for (var key in data) {
            if (typeof data[key] === 'string' && data[key].indexOf('{') > -1) {
                data[key] = parsePath(data[key], event, data, module_instance);
            }
        }

        // merge argument data to data object
        if (_data) {
            for (var key in _data) {
                data[key] = _data[key];
            }
        }
        
        // merge static and dynamic data
        data = handleDataMerging(config, event, data, _module_instance);
        */
        
        // plug external events
        if (adapter) {
            adapter.handler(data, adapter.data);
        }
        
        // extend event with location data (hash, search, path)
        if (global.location) {
            handleStateValues(data);
        }
           
        // send first data event with the configured flow data
        eventStream.send(null, data);
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
                data[key] = engine.path(path, [event, data, module_instance, global]);
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
                path = typeof value === 'object' ? value : path.replace(match[i], value);
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
function searchToJSON(search) {
    var rep = {'?':'{"','=':'":"','&':'","'};
    var s = search.replace(/[\?\=\&]/g, function(r) {
        return rep[r];
    });
    return JSON.parse(s.length? s+'"}' : "{}");
}
