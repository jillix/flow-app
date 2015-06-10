var utils = require('./utils');

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
module.exports = function flowHandler (flow, adapter) {
    var module_instance = this._;
    
    /*
        {
            on: "event",
            to: "(:)instance",
            emit: "event",
            call: "path"
            transform: ["path", {config}]
        }
    */
        
    // get target module instance, or continue if not found
    // and check module instance acces for server side
    if (
        (flow.to && !(module_instance = engine.instances[flow.to])) &&
        (eventStream.role && !utils.roleAccess(module_instance, eventStream.role))
    ) {
        return;
    }
    
    // emit transmitter to other flow handlers
    if (typeof flow.emit === 'string') {
        module_instance.emit(flow.emit, transmitter);
    }
    
    // add data handler to transmitter
    // TODO pass config to transform handler
    if ((flow.transform = getMethodFromPath(flow.transform, module_instance))) {
        // TODO data handler are receiver specific
        transmitter.data(flow.transform, module_instance);
    }
    
    // pass transmitter to receiver function
    if ((flow.receiver = getMethodFromPath(flow.receiver, module_instance))) {
        flow.receiver.call(module_instance, transmitter);
    }
};

/**
 * Return a function or undefined.
 */
function getMethodFromPath (path, module_instance) {
  
    var _path;
     
    if (typeof path === 'string' && typeof (_path = getPathValue(path, module_instance)) !== 'function') {
        console.error('Flow method is not a function.\nValue for "' + path + '" is:', _path);
        return;
    }
    
    if (typeof _path === 'function') {
        return _path;
    }
}

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
            parsedFlow.data[key] = parsePath(config.data[key], module_instance, data);
        }
    }
    
    // search for path in data and module instance and set it to the cloned config
    // "set": {"key": "{path}", "key": "${#css:attr}"}    
    if (config.set) {
        for (key in config.set) {
            parsedFlow.data[key] = parsePath(config.set[key], module_instance, data, true);
        }
    }

    // create nest objects with flat keys
    if (config.data || config.set) {
        parsedFlow.data = utils.deep(parsedFlow.data);
    }
    
    // "load": ["{instance}"]
    if (config.load) {
        parsedFlow.load = [];
        
        for (var l = 0, ll = config.load.length; l < ll; ++l) {
            parsedFlow.load[l] = parsePath(config.load[l], module_instance, data);
        }
    }
    
    // "route": "{path}"
    if (config.route) {
        parsedFlow.route = parsePath(config.route, module_instance, data);
    }

    if (config.flow && config.flow.length) {
        parsedFlow.flow = [];
      
        for (var f = 0, lf = config.flow.length, flow, pFlow; f < lf; ++f) {
            flow = config.flow[f];
            pFlow = {};
            
            // "call": "{method}"
            if (flow.call) {
                pFlow.call = parsePath(flow.call, module_instance, data);
            }
            
            // "pipe": "{event}"
            if (flow.pipe) {
                pFlow.pipe = parsePath(flow.pipe, module_instance, data);
            }
            
            // "to": {instance}
            if (flow.to) {
                pFlow.to = parsePath(flow.to, module_instance, data);
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
function parsePath (path, module_instance, data, getValue) {

    if (path.indexOf('{') < 0) {
        return getValue ? getPathValue(path, data, module_instance) : path;
    }

    var match = path.match(find_tmpl);

    // replace route with data
    if (match) {
        for (var i = 0, value; i < match.length; ++i) {

            // get value from object
            value = utils.path(match[i].replace(find_braces, ''), [data, module_instance]);

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
function getPathValue (path, module_instance, data) {

    // get an attribute value from a dom element or the element itself
    if (path[0] === '$') {
        path = path.substr(1).split(':');

        // get find an element in the document
        path[0] = document.querySelector(path[0]);

        // set data key to the dom attribute value or the dom element
        return path[1] && path[0][path[1]] !== undefined ? path[0][path[1]] : path[0];

    }
    
    if (!data) {
        return utils.path(path, [module_instance, global]);
    }
    
    // return search value with a path: 1. data, 3. instance, 4. global
    return utils.path(path, [data, module_instance, global]);
}






