var EventEmitter = require('./events');
var Flow = require('./flow');
var utils = require('./utils');

// css cache
var cssCache = {};

// html snippet cache
var htmlCache = {};

// module instance cache
var instances = engine.instances = {
    '@': engine
};

// reset caches on reload
/*engine.on('reload', function (keepDom) {
    cssCache = {};
    htmlCache = {};
    instances = {};
    
    // reset html
    if (!keepDom) {
        body.body.innerHTML = '';
    }
});*/

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The object, which is extended with the observable methods.
 * @param {object} The parent module instance, which loads this instance.
 */
module.exports = function loadModuleInstance (name, tempLoadingCache) {

    // check modules cache
    if (instances[name]) {
        return;
    }

    // create a new empty Module
    var module_instance = utils.clone(EventEmitter);

    // get or create an temporary loading cache array
    tempLoadingCache = tempLoadingCache || [];

    // set initial count to zero
    tempLoadingCache.count = tempLoadingCache.count || 0;

    // push the newly created instance to temporary loading cache
    tempLoadingCache.push(module_instance);

    // save module instance in cache to prevent overlapping requests
    if (name) {
        instances[name] = module_instance;
    }

    // create event object
    module_instance._events = {};

    // create a link
    var link = engine.emit('load');
    link.data(function (err, config) {

        // handle error
        if (err) {

            // remove module instance from cache
            name && delete instances[name];

            // emit error event
            return engine.emit('moduleLoadError', err);
        }

        // save config on module instance
        module_instance._config = config.config || {};

        // save the flow config for internal events (engine observer)
        module_instance._incoming = config.incoming;
        
        // save the flow config for internal events (engine observer)
        module_instance._outgoing = config.outgoing;

        // save the flow config for external events (ex. DOM events)
        module_instance._external = config.external;

        // save module name
        module_instance._name = config.name || name;

        // save module name on module instance
        module_instance._module = config.module;

        // save module instance with configured name in cache
        if (!name) {
            instances[config.name] = module_instance;
        }

        // load css
        config.styles && loadCssFiles(config.styles);

        // load sub modules
        if (config.load) {

            for (var i = 0; i < config.load.length; ++i) {
                loadModuleInstance(config.load[i], tempLoadingCache);
            }
        }

        // load html snippets
        if (config.markup) {

            // decrement loading count
            --tempLoadingCache.count;

            // load html snippets
            loadHtmlSnippet(config.markup, function (err) {
                loadHandler(err, tempLoadingCache);
            });
        }

        // load scripts
        if (config.scripts) {

            // call load hanlder after the module scripts are loaded
            engine.load(config.scripts, module_instance, function (err) {
                loadHandler(err, tempLoadingCache);
            });

        } else {

            // call load handler emeditally, if no scripts have to be loaded
            loadHandler(null, tempLoadingCache);
        }
    });

    // send module instance name
    link.write(null, name);
};

/**
 * Setup event flow, emit ready events and after all module instances are ready, emit a route event.
 *
 * @public
 * @param {err} The err string.
 * @param {array} The loaded module instances.
 */
function loadHandler (err, loadedModuleInstances) {

    // emit error event
    if (err) {
        return engine.event('moduleLoadError').emit(err);
    }

    // check if all module instances are loaded
    if (++loadedModuleInstances.count === loadedModuleInstances.length) {

        // initialize module instances
        for (var i = 0, l = loadedModuleInstances.length, iFlow, oFlow, moduleInstance; i < l; ++i) {
            moduleInstance = loadedModuleInstances[i];
            iFlow = moduleInstance._incoming;
            oFlow = moduleInstance._outgoing;
            
            // setup event flow
            if (iFlow) {
                
                for (var f = 0, fl = iFlow.length, config; f < fl; ++f) {
                    config = iFlow[f];

                    if (!config.on) {
                        continue;
                    }

                    // listen to events
                    moduleInstance.on(
                        config.on,
                        config,
                        config['1']
                    );
                }
            }
            
            // prepare out flow handlers
            if (oFlow) {
                
                moduleInstance.out = {};
                
                // create out flow handlers on the instance
                for (var name in oFlow) {
                    moduleInstance.out[name] = Flow(module_instance, oFlow[name]);
                }
            }

            // call the factory method if it exists
            if (moduleInstance.init) {
                moduleInstance.init();
            }

            // emit the ready event
            moduleInstance.emit('ready');
        }
    }
}

/**
 * Load html snippets.
 *
 * @public
 * @param {array} The array containing html snippet file urls.
 */
function loadHtmlSnippet (urls, callback) {

    // save snippet count
    var count = urls.length;

    // create link
    var link = Link('html', callback);

    // receive the html snipptes
    link.data(function (err, html) {

        // ignore errors
        if (err || !html) {
            return;
        }

        // save html snippet in cache
        htmlCache[html[0]] = html[1];

        // check if all snippets are loaded
        if (--count === 0) {
            link.end();
        }
    });

    // fetch html snippets
    for (var i in urls) {

        // fetch html snippet
        if (!htmlCache[urls[i]]) {

            // send url
            link.send(null, urls[i]);

        // or check count down
        } else {

            // check if all snippets are loaded
            if (--count === 0) {
                link.end();
            }
        }
    }
}

/**
 * Load css files.
 *
 * @public
 * @param {array} The array containing css file urls.
 */
function loadCssFiles (urls) {

    for (var i = 0, link; i < urls.length; ++i) {
        if (!cssCache[urls[i]]) {
            cssCache[urls[i]] = 1;

            link = body.createElement('link');

            // append public file prefix
            if (isPublicPath.test(urls[i])) {
                urls[i] = '/!' + urls[i];

            // append module file prefix
            } else if (urls[i].indexOf('://') < 0 && urls[i].indexOf('//') !== 0) {
                urls[i] = '/@/@/' + urls[i];
            }

            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', urls[i]);
            body.head.appendChild(link);
        }
    }
}
