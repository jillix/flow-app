var Flow = require('./flow');
var utils = require('./utils');
var isPublicPath = /^\/[^/]/;
var styles = {};
var markups = engine.markup = {};

// global module instance cache
var instances = engine.instances = {};

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The CommonJS module.
 * @param {object} The composition config.
 * @param {function} Callback handler.
 */
module.exports = function factory (module, config, role, callback, loaderInstance) {

    // check instance cache
    if (instances[config.name]) {
        return callback(null, instances[config.name]);
    }

    // create new flow emitter
    var instance = Flow();
    var countDown = 1;
    var readyHandler = function (err) {

        // TODO handle error

        if (--countDown === 0) {

            // don't init dependency instances
            if (loaderInstance) {
                return callback(null, instance);
            }

            initInstancesInLoadOrder(instance, callback, loaderInstance);
        }
    };

    // extend module instance with module methods
    if (module) {
        for (var prop in module) {
            instance[prop] = module[prop];
        }
    }

    // save module instance in cache
    instances[config.name] = instance;

    // extend instance
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._access = {};
    instance._load = config.load;

    if (config.flow) {
        instance._flow = config.flow;
    }

    // collect dependency instance names in loader dependencies
    if (loaderInstance) {
        loaderInstance._load.concat(config.load || []);
    }

    // load styles
    config.styles && loadStyles(config.styles);

    // load markup
    if (config.markup && config.markup.length) {
        ++countDown;
        loadSnippets(config.markup, readyHandler);
    }

    // only client, on the server the module can just use require any file
    if (config.load) {
        countDown += config.load.length;

        for (var i = 0, l = config.load.length; i < l; ++i) {
            engine.load(config.load[i], role, readyHandler, loaderInstance || instance);
        }
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
function initInstancesInLoadOrder (instance, callback) {

    // init instance
    setupFlowAndInit(instance);

    // init dependencies
    var dependencies = instance._load;
    if (dependencies) {
        // initialize module instances
        for (var i = 0, l = dependencies.length, moduleInstance, flow; i < l; ++i) {
            setupFlowAndInit(engine.instances[dependencies[i]]);
        }
    }

    callback(null, instance);
}

function setupFlowAndInit (instance) {

    // setup event flow
    var flows = instance._flow;
    if (flows) {

        for (var i = 0, l = flows.length, flow; i < l; ++i) {
            flow = flows[i];
            if (flow.on) {

                // update event access
                instance._access[flow.on] = true;

                // append flow handler
                instance.mind(flow.on, flow);
            }
        }
    }

    // call the factory method if it exists
    if (instance.init) {
        instance.init();
    }
}

/**
 * Load html snippets.
 *
 * @public
 * @param {array} The array containing html snippet file urls.
 */
function loadSnippets (urls, callback) {

    var count = urls.length;
    var stream = engine.flow('M');

    // TODO cache snipptes (instance + path)

    // receive html snipptes
    stream.data(function (err, html) {

        // ignore errors
        if (err || !html) {
            // check if all snippets are loaded
            if (--count === 0) {
                stream.end();
                callback();
            }
            return;
        }

        // save html snippet in cache
        markups[html[0]] = html[1];

        // check if all snippets are loaded
        if (--count === 0) {
            stream.end();
            callback();
        }
    });

    // get html snippets
    for (var i in urls) {
        if (!markups[urls[i]]) {
            stream.write(null, urls[i]);

        } else if (--count === 0) {
            stream.end();
            callback();
        }
    }
}

/**
 * Load css files.
 *
 * @public
 * @param {array} The array containing css file urls.
 */
function loadStyles (urls) {

    for (var i = 0, link; i < urls.length; ++i) {
        if (!styles[urls[i]]) {
            styles[urls[i]] = 1;

            link = global.document.createElement('link');

            // append public file prefix
            if (isPublicPath.test(urls[i])) {
                urls[i] = '/!' + urls[i];

            // append module file prefix
            } else if (urls[i].indexOf('://') < 0 && urls[i].indexOf('//') !== 0) {
                urls[i] = '/@/@/' + urls[i];
            }

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', urls[i]);
            global.document.head.appendChild(link);
        }
    }
}
