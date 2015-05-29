// regular expression patterns
var find_tmpl = /\{([\w\.]+)\}/g;
var find_braces = /\{|\}/g;

/**
 * Create a new config event handler.
 *
 * @public
 * @param {object} The module instance.
 * @param {object} The "out" config.
 * @param {object} The adapter object (optional).
 */
engine.flow = function (module_instance, config, adapter) {
    
    /*
        IDEA: - make events strict again (events[event]) -> performance gain
              - handle routes separately (on(route, engine.config())) -> better maintainabillity
              - route handling in a separate module, yes
    */
    
    /**
     * The config event handler.
     *
     * @public
     * @param {object} The event object.
     * @param {object} The event data.
     */
    return function handler (eventStream) {

        // reslove data fields and clone the config config object
        config = resolveAndClone(config, module_instance, adapter);
        
        // load module instances
        if (config.load) {
            // load module instances
            for (var m = 0, ml = config.load.length; m < ml; ++m) {
                engine.module(config.load[m]);
            }
        }
        
        // route to url
        if (config.route) {
            engine.route(config.route);
        }
        
        // check flow content
        if (config.flow && config.flow.length) {
    
            // execute the flow configs
            for (var i = 0, l = config.flow.length, flow, key; i < l; ++i) {
                flow = config.flow[i];
                
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
                    // ..send config config as data to server?
                }
    
                // pipe event to another event
                if (flow.pipe) {
                    eventStream.pipe(module_instance.event(flow.pipe));
                }
    
                // append method call event data handlers
                if (flow.call) {
                    eventStream.data(flow.call, module_instance);
                }
            }
        }
        
        // send first data event with the configured config data
        eventStream.emit(null, config.data);
    };
};

/**
 * Resolve data fields in for incoming configs.
 *
 * @private
 * @param {object} The config config.
 * @param {object} The data object.
 * @param {object} The module instance.
 */
function resolveAndClone (config, module_instance, adapter) {

    var parsedFlow = {
        data: {}
    };
    var data = parsedFlow.data;
    var key;
    
    // extend data with location data (hash, search, path)
    if (global.location) {
        handleStateValues(data);
    }

    // add custom data to the first data emit
    if (adapter) {
        adapter.handler(data, adapter.data);
    }
    
    // "data": {"key": "{value}"}
    if (config.data) {
        for (key in config.data) {
          
            // parse the data field values
            parsedFlow.data[key] = parsePath(config.data[key], data, module_instance);
        }
    }
    
    // search for path in data and module instance and set it to the cloned config
    // "set": {"key": "{path}", "key": "${#css:attr}"}    
    if (config.set) {
        for (key in config.set) {
            parsedFlow.data[key] = parsePath(config.set[key], data, module_instance, true);
        }
    }

    // create nest objects with flat keys
    if (config.data || config.set) {
        parsedFlow.data = engine.deep(parsedFlow.data);
    }
    
    // "load": ["{instance}"]
    if (config.load) {
        parsedFlow.load = [];
        
        for (var l = 0, ll = config.load.length; l < ll; ++l) {
            parsedFlow.load[l] = parsePath(config.load[l], data, module_instance);
        }
    }
    
    // "route": "{path}"
    if (config.route) {
        parsedFlow.route = parsePath(config.route, data, module_instance);
    }

    if (config.flow && config.flow.length) {
        parsedFlow.flow = [];
      
        for (var f = 0, lf = config.flow.length, flow, pFlow; f < lf; ++f) {
            flow = config.flow[f];
            pFlow = {};
            
            // "call": "{method}"
            if (flow.call) {
                pFlow.call = parsePath(flow.call, data, module_instance, true);
            }
            
            // "pipe": "{event}"
            if (flow.pipe) {
                pFlow.pipe = parsePath(flow.pipe, data, module_instance);
            }
            
            // "to": {instance}
            if (flow.to) {
                pFlow.to = parsePath(flow.to, data, module_instance);
            }
            
            // push flow into parsed flow object
            parsedFlow.flow[f] = pFlow;
        }
    }
    
    return parsedFlow;
}

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
 * Replace data fields in a string.
 *
 * @private
 * @param {string} The string.
 * @param {object} The data context.
 */
function parsePath (path, data, module_instance, getValue) {

    if (path.indexOf('{') < 0) {
        return getValue ? getPathValue(path, data, module_instance) : path;
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
    
    // get path value or return path
    return getValue ? getPathValue(path, data, module_instance) : path;
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






