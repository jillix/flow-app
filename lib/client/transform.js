var utils = require('./utils');

// regular expression patterns
var find_tmpl = /\{([\w\.]+)\}/g;
var find_braces = /\{|\}/g;

/**
 * Resolve data fields in for incoming configs.
 *
 * @private
 * @param {object} The config config.
 * @param {object} The data object.
 * @param {object} The module instance.
 */
module.exports = function (stream, data, options) {

    // ignore if data is null
    if (data === null) {
        return data;
    }

    if (typeof data !== 'object') {
        data = {data: data};
    }

    // ensure data object
    if (options && (options.data || options.set)) {
        data = data || {};
    }

    // extend data with location data (hash, search, path)
    if (global.location) {
        handleStateValues(data);
    }

    var key;

    // "data": {"key": "{value}"}
    if (options.data) {
        for (key in options.data) {

            // parse the data field values
            data[key] = parsePath(options.data[key], this._, data);
        }
    }

    // search for path in data and module instance and set it to the cloned config
    // "set": {"key": "{path}", "key": "${#css:attr}"}
    if (options.set) {
        for (key in options.set) {
            data[key] = parsePath(options.set[key], this._, data, true);
        }
    }

    // create nest objects with flat keys
    if (options.data || options.set) {
        data = utils.deep(data);
    }

    return data;
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
 * Replace data fields in a string.
 *
 * @private
 * @param {string} The string.
 * @param {object} The data context.
 */
function parsePath (path, module_instance, data, getValue) {

    if (typeof path !== 'string') {
        return path;
    }

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
