var Flow = require('./flow');
var utils = require('./utils');
var isPublicPath = new RegExp("^\/[^/]");
var markups = {};
var cbBuffer = {};

// global module instance cache
var instances = {};

engine._r.push(function () {

    //reset caches
    instances = engine.instances = {};
    markups = {};
    cbBuffer = {};

    // reset DOM body
    document.body.innerHTML = '';

    // remove styles
    var styles = document.head.querySelectorAll('link[rel=stylesheet]');
    if (styles) {
        styles.forEach(function (stylesheet) {
            stylesheet.remove();
        });
    }
});

// call callbacks
function callbacks (err, instance, cbs) {
    cbs.forEach(function (callback) {
        callback(err, instance);
    });
}

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The CommonJS module.
 * @param {object} The composition config.
 * @param {function} Callback handler.
 */
module.exports = function factory (module, config, role, callback, loaderInstance) {

// TODO handle flow calls (stream, options, data)
/*
// check chached instance access
if (engine.instances[name]) {

    if (!utils.roleAccess(engine.instances[name], role)) {
        return callback(engine.log('E', new Error('Access denied for instance:' + name)));
    }

    return callback(null, engine.instances[name]);
}
*/

    // check instance cache
    if (instances[config.name]) {

        // buffer callback
        if (instances[config.name] === 1 || !instances[config.name]._ready) {
            return cbBuffer[config.name].push(callback);
        }

        return callback(null, instances[config.name]);
    }

    // save callback and mark instance as loading
    cbBuffer[config.name] = [callback];
    instances[config.name] = 1;

    // create new flow emitter
    var instance = Flow();
    var countDown = 1;
    var readyHandler = function (err) {
        if (--countDown === 0) {

            if (err) {
                callbacks(err, undefined, cbBuffer[config.name]);
                delete cbBuffer[config.name];
                delete instances[config.name];
                return;
            }

            // setup flow
            if (config.flow) {
                config.flow.forEach(function (flow) {
                    if (flow.constructor === Array) {

                        // create event streams cache
                        if (!instance._flow[flow[0]]) {
                            instance._flow[flow[0]] = []
                        }

                        // push flow stream config to stream cache
                        instance._flow[flow[0]].push(flow.slice(1));
                    }
                });
            }

            // don't init dependency instances
            if (loaderInstance) {

                // save not yet initialized instance in cache
                instances[config.name] = instance;
                return callback(null, instance);
            }

            initInstancesInLoadOrder(instance);
        }
    };

    // extend module instance with module properties
    if (module) {
        Object.keys(module).forEach(function (key) {
            instance[key] = module[key];
        });
    }

    // extend instance
    instance._module = config.module;
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._load = config.load;
    instance._flow = {};
    instance._markups = {};

    // collect dependency instance names in loader dependencies
    if (loaderInstance && config.load) {
        loaderInstance._load.concat(config.load);
    }

    // extend with logging methods
    instance.log = require('./logs') || function () {};

    // load styles
    config.styles && loadStyles(config.styles);

    // load markup
    if (config.markup && config.markup.length) {
        ++countDown;
        loadSnippets(instance, config.markup, readyHandler);
    }

    // only client, on the server the module can just use require any file
    if (config.load) {
        countDown += config.load.length;
        config.load.forEach(function (childInstance) {
            engine.load(childInstance, role, readyHandler, loaderInstance || instance);
        });
    }

    readyHandler();
};

/**
 * Setup event flow, emit ready events and after all module instances are ready, emit a route event.
 *
 * @public
 * @param {err} The err string.
 * @param {array} The loaded module instances.
 */
function initInstancesInLoadOrder (instance) {

    // init dependencies
    var dependencies = instance._load;
    if (dependencies) {

        // init instances
        dependencies.forEach(function (dependency) {

            if (!instances[dependency]) {
                return engine.log('E', 'Instance "' + dependency + '" not found.');

            }

            if (instances[dependency].init) {
                instances[dependency].init();
            }

            instances[dependency]._ready = true;
            callbacks(null, instances[dependency], cbBuffer[dependency]);
        });
    }

    // init loader instance
    if (instance.init) {
        instance.init();
    }

    // save module instance in cache
    instances[instance._name] = instance;

    instance._ready = true;
    callbacks(null, instance, cbBuffer[instance._name]);
}

/**
 * Load html snippets.
 *
 * @public
 * @param {array} The array containing html snippet file urls.
 */

function loadSnippets (instance, urls, callback) {

    var count = urls.length;
    var stream = engine.flow('M', true);

    // receive html snipptes
    stream.error(function (stream, options, err) {

        engine.log('E', err);

        // check if all snippets are loaded
        if (--count === 0) {
            stream.end();
            callback();
        }

    }).data(function (stream, options, html) {

        // save html snippet in cache
        instance._markups[html[0]] = html[1];

        // check if all snippets are loaded
        if (--count === 0) {
            stream.end();
            callback();
        }
    });

    // get html snippets
    urls.forEach(function (url) {
        if (!instance._markups[url]) {
            stream.write(null, url);

        } else if (--count === 0) {
            stream.end();
            callback();
        }
    });
}

/**
 * Load css files.
 *
 * @public
 * @param {array} The array containing css file urls.
 */
function loadStyles (urls) {

    urls.forEach(function (url) {

        var link = global.document.createElement('link');

        // append public file prefix
        if (isPublicPath.test(url)) {
            url = '/!' + url;

        // append module file prefix
        } else if (url.indexOf('://') < 0 && url.indexOf('//') !== 0) {
            url = '/@/@/' + url;
        }

        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', url);
        global.document.head.appendChild(link);
    });
}
