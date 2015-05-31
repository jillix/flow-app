// observer module
(function (global, body, state) {

    /**
     * Wrapper function for CommonJS modules.
     *
     * @public
     * @param {string} The complete file path.
     * @param {function} The wrapper function, which returns the module object
     */
    var engine = global.E = function Engine (path, module) {
        
        // save module evaluation function in cache
        engine.scripts[path] = module;
      
        // create CommonJS module directly if path is not loaded from a dependency list.
        if (!engine.scripts[path]) {
            createCommonJSModule(path);
        
        // emit path as event to create CommonJS modules in order,
        // after all resources are loaded.
        } else {
            engine.emit(path);
        }
    };

    var wesocketReconnectTimeoutId;
    var isPublicPath = /^\/[^/]/;
    var checkFp = /\.@[a-z0-9]{7}\.(?:js|css|html)$/i;
    
    var EventEmitter = {
      
        /**
         * Call handlers of a specific event or pipe if handler is a stream.
         *
         * @public
         * @param {string} The event name.
         * @param {object} The data for the event handlers.
         */
        emit: function (eventName, data) {
            var instance = this;
            var events = instance._events;
    
            // compare event or test regex
            if (events[eventName]) {
              
                // index for events that must be removed
                var obsoleteEvents = [];
    
                // call handlers
                for (var i = 0, l = events[eventName].length, event; i < l; ++i) {
                    handler = events[eventName][i];
                  
                    if (handler) {
    
                        // if handler and data are event streams, pipe to the handler
                        if (handler.pipe && data.pipe) {
                            data.pipe(handler);
    
                        // call registered Methods
                        } else {
                            handler.call(instance, data);
                        }
                        
                        // remove from event buffer, if once is true
                        if (handler._1) {
                            handler = undefined;
                            obsoleteEvents.push([eventName, i]);
                        }
                    }
                }
                
                // remove obsolete events
                this._rm(obsoleteEvents);
            }
        },

        /**
         * Listen on an event.
         *
         * @public
         * @param {string} The even name regular expression pattern.
         * @param {function} The event handler.
         * @param {boolean} Event handler is removed after calling.
         * @param {boolean} If an event is emitted from the route method, the event
         *                  loop stops, when an event is found. This argument tells the
         *                  event loop to continue.
         */
        on: function (eventName, handler, once) {
    
            var events = this._events;
    
            // get handler from a path
            if (typeof handler !== 'function' && typeof handler !== 'object') {
                return;
            }
    
            if (!events[eventName]) {
                events[eventName] = [];
            }
    
            handler._1 = once;
            events[eventName].push(handler);
        },

        /**
         * Remove an event or a single event hanlder from the event loop.
         *
         * @public
         * @param {string} The even name regular expression pattern.
         * @param {function} The event handler.
         */
        off: function (event, handler) {
    
            var events = this._events;
    
            if (events[event]) {
    
                if (handler) {
                    var rm = [];
    
                    for (var i = 0; i < events[event].length; ++i) {
                        if (events[event][i] === handler) {
                            events[event][i] = undefined;
                            rm.push([event, i]);
                        }
                    }
    
                    this._rm(rm);
    
                } else {
                    delete events[event];
                }
            }
        },
        
        /**
         * Removes the collected events from an observable.
         *
         * @private
         * @param {object} The events of an observable.
         * @param {array} The infos for removing events.
         */
        _rm: function (rmObject) {
    
            if (rmObject.length) {
                var events = this._events;
                for (var i = 0, l = rmObject.length; i < l; ++i) {
                    
                    // remove handler
                    events[rmObject[i][0]].splice(rmObject[i][1], 1);
    
                    // remove event
                    if (events[rmObject[i][0]].length === 0) {
                        delete events[rmObject[i][0]];
                    }
                }
            }
        }
    };
    
    // extend engine with event emitter
    for (var key in EventEmitter) {
        engine[key] = EventEmitter[key];
    }
    engine._events = {};
    
    // client flag
    engine.client = true;

    // default config
    engine._module = '@';

    // cache for active links
    engine._links = {};

    // module instance cache
    engine.instances = {};

    // script cache
    engine.scripts = {};

    // css cache
    engine.csss = {};

    // html snippet cache
    engine.htmls = {};
    
    // append clone function
    engine.clone = clone;
    
    /**
     * Clone object. True prototypal inheritance.
     *
     * @public
     * @param {object} The, to be cloned, object.
     */
    function clone (object) {
    
        // create an empty function
        function O() {}
    
        // set prototype to given object
        O.prototype = object;
    
        // create new instance of empty function
        return new O();
    }

    /**
     * Load module scripts depedencies.
     *
     * @public
     * @param {array} The file paths.
     * @param {object} The module instance.
     * @param {function} The callback handler.
     */
    engine.load = function (scripts, module_instance, callback) {

        // get the number of scripts
        var length = scripts.length;

        // ensure callback
        callback = callback || function () {};

        // create CommonJS module, when all scrips are loaded
        function moduleLoaded (module) {
            if (--length === 0) {
                evaluateScriptsInOrder(scripts, module_instance, callback);
            }
        }

        // loop through scripts
        for (var i = length - 1, url, cleanPath; i >= 0; --i) {

            url = cleanPath = scripts[i];

            if (checkFp.test(url)) {

                // split path
                cleanPath = url.split('.');

                // remove fingerprint from read path
                cleanPath.splice(cleanPath.length - 2, 1);

                // create path without fingerprint
                cleanPath = cleanPath.join('.');
            }

            // append public file prefix
            if (isPublicPath.test(cleanPath)) {
                url = '/!' + url;

            // append module file prefix
            } else if (url.indexOf('://') < 0 && url.indexOf('//') !== 0) {
                url = '/@/@/' + url;

            // handle external files, that must be wrapped
            } else if (url[0] === '#') {
                url = '/@/@/!/' + url.substr(1) + '?w=1';
                cleanPath = cleanPath.substr(1);
            }

            // overwrite script path with path without fingerprints
            scripts[i] = cleanPath;

            // pipe fileLoaded event stream to checkLoaded event stream,
            // to check when all scripts are evaluated
            engine.on(cleanPath, moduleLoaded, 1);

            // emit source event for already loaded scripts
            if (engine.scripts[cleanPath] && engine.scripts[cleanPath] !== 1) {
                engine.emit(cleanPath);

            // load module scripts
            } else if (!engine.scripts[cleanPath]) {

                // create script cache entry
                engine.scripts[cleanPath] = 1;

                // crate script dom elemeent
                var node = body.createElement('script');

                // set url and append dom script elm to the document head
                node.src = url;
                body.head.appendChild(node);
            }
        }
    };

    /**
     * Initialize CommonJS modules in order of the dependencies.
     *
     * @private
     * @param {object} .
     */
    function evaluateScriptsInOrder (scripts, module_instance, callback) {

        // init modules in order (desc)
        for (var i = (scripts.length - 1), l = 0; i >= l; --i) {

            // evaluate module script
            if (typeof engine.scripts[scripts[i]] === 'function' && !engine.scripts[scripts[i]]._eval) {
                createCommonJSModule(scripts[i]);
            }
        }

        // extend module instance with exported module methods
        for (var prop in engine.scripts[scripts[0]].exports) {
            module_instance[prop] = engine.scripts[scripts[0]].exports[prop];
        }

        // return module instance
        callback();
    }
    
    /**
     * Evaluate/create CommonJS module.
     *
     * @public
     * @param {string} The script path.
     */
    function createCommonJSModule(script) {
        
        var module = {
            id: script,
            exports: {}
        };
  
        var path = module.id.split('/');
        module.file = path.pop();
        module.base = path.join('/');
  
        // execute CommonJS module
        engine.scripts[script] = engine.scripts[script].call(module.exports, require(module), module, module.exports, global, engine);
        engine.scripts[script]._eval = true;
    }

    function getNearestModulePath (module, name) {

        var path = '';

        // separate module name and path
        if (name.indexOf('/') > 0) {
            path = name.split('/');
            name = path.shift();
            path = path.join('/');
        }

        // TODO find a way to require a module without version
        /*var version = '0.1.0';
        var main = '';
        var versionMap = {
            view: {
                v: '0.1.0',
                m: 'main/file.js',
                s: {
                    moduleName: {
                      v: '0.1.0',
                      m: 'trucken/client.js'
                }
            ]
        };

        for (var moduleId in versionMap) {

        }*/

        return  name + '@' + version + '/' + (path || main || 'index.js');
    }

    /**
     * The CommonJS require function.
     *
     * @private
     * @param {object} The module object.
     */
    function require (module) {
        return function (name) {

            // handle different path types
            switch (name.indexOf('./')) {

                // external module
                case -1:

                    // get the path from the module version relative to the base
                    //name  = getNearestModulePath(module, name);
                    break;

                // relative forward
                case 0:
                    // ...create path with module base
                    name = module.base + '/' + name.substr(2);
                    break;

                // relative backward
                case 1:
                    // ...create path with module base
                    name = name.split('../');
                    var stepsBack = name.length;
                    var basePath = module.base.split('/');

                    // return if module path is exceeded
                    if (basePath.length < stepsBack) {
                        return;
                    }

                    // create new path
                    name = basePath.slice(0, (stepsBack - 1) * -1).join('/') + '/' + name.pop();
            }

            name += name.slice(-3) !== '.js' ? '.js' : '';

            if (engine.scripts[name]) {
                return engine.scripts[name].exports;
            }
        };
    }

    /**
     * Create a new module instance.
     *
     * @public
     * @param {object} The object, which is extended with the observable methods.
     * @param {object} The parent module instance, which loads this instance.
     */
    engine.module = function (name, tempLoadingCache) {

        // check modules cache
        if (engine.instances[name]) {
            return;
        }

        // create a new empty Module
        var module_instance = engine.clone(EventEmitter);
        
        // extend module instance with the link factory
        module_instance.link = engine.link;

        // get or create an temporary loading cache array
        tempLoadingCache = tempLoadingCache || [];

        // set initial count to zero
        tempLoadingCache.count = tempLoadingCache.count || 0;

        // push the newly created instance to temporary loading cache
        tempLoadingCache.push(module_instance);

        // save module instance in cache to prevent overlapping requests
        if (name) {
            engine.instances[name] = module_instance;
        }

        // module instances link cache
        module_instance._links = {};

        // create event object
        module_instance._events = {};

        // create a link
        var link = engine.link('load', function (err, config) {

            // handle error
            if (err) {

                // remove module instance from cache
                name && delete engine.instances[name];

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
                engine.instances[config.name] = module_instance;
            }

            // load css
            config.styles && engine.css(config.styles);

            // load sub modules
            if (config.load) {

                for (var i = 0; i < config.load.length; ++i) {
                    engine.module(config.load[i], tempLoadingCache);
                }
            }

            // load html snippets
            if (config.markup) {

                // decrement loading count
                --tempLoadingCache.count;

                // load html snippets
                engine.html(config.markup, function (err) {
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
        link.send(null, name);
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

                        if (!config.on || !config.flow) {
                            continue;
                        }

                        // listen to events
                        moduleInstance.on(
                            config.on,
                            engine.flow(moduleInstance, config),
                            config['1'],
                            config.nr
                        );
                    }
                }
                
                // prepare out flow handlers
                if (oFlow) {
                    
                    moduleInstance.out = {};
                    
                    // create out flow handlers on the instance
                    for (var name in oFlow) {
                        moduleInstance.flow[name] = engine.flow(module_instance, oFlow[name]);
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
    engine.html = function (urls, callback) {

        // save snippet count
        var count = urls.length;

        // create link
        var link = engine.link('html', callback);

        // receive the html snipptes
        link.data(function (err, html) {

            // ignore errors
            if (err || !html) {
                return;
            }

            // save html snippet in cache
            engine.htmls[html[0]] = html[1];

            // check if all snippets are loaded
            if (--count === 0) {
                link.end();
            }
        });

        // fetch html snippets
        for (var i in urls) {

            // fetch html snippet
            if (!engine.htmls[urls[i]]) {

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
    };

    /**
     * Load css files.
     *
     * @public
     * @param {array} The array containing css file urls.
     */
    engine.css = function (urls) {

        for (var i = 0, link; i < urls.length; ++i) {
            if (!engine.csss[urls[i]]) {
                engine.csss[urls[i]] = 1;

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
    };

    /**
     * Connect to the server and start listening to messages.
     *
     * @public
     */
    engine.listen = function () {

        // reset websocket reconnect timer
        if (wesocketReconnectTimeoutId) {
            clearTimeout(wesocketReconnectTimeoutId);
            wesocketReconnectTimeoutId = 0;
        }

        // dont load entrypoint module instance if socket tries to reconnect
        var loadModule = engine.socket ? false : true;

        // create the websocket
        var websocket = engine.socket = new WebSocket('ws://' + window.location.host + '/');

        /**
         * Load the entrypoint module instance on socket open.
         *
         * @private
         */
        websocket.onopen = function () {
            engine.module();
        };

        /**
         * Message handler.
         *
         * @private
         * @param {string} The message string.
         */
        websocket.onmessage = function (message) {
            engine.link.message(message.data, websocket);
        };

        /**
         * Reconnect socket on close.
         *
         * @private
         */
        websocket.onclose = function (closeEvent) {

            // reload imemdiately, when socket is closed by reload
            if (closeEvent.code === 3000) {
                engine.listen();

            // every other case, engine tries to realod after ca. 3 seconds
            } else {
                wesocketReconnectTimeoutId = setTimeout(engine.listen, 3333);
            }
        };
    };

    /**
     * Empties all caches and reloads the modules.
     *
     * @public
     * @param {boolean} Don't remove the DOM nodes.
     * @todo check for memory leaks
     */
    engine.reload = function (keepDom) {

        // reset module cache
        engine.scripts = {};
        engine.instances = {};
        engine._links = {};
        engine._events = {};

        // reset html
        if (!keepDom) {
            body.body.innerHTML = '';
        }

        // close the websocket and reconnect immedialtey
        engine.socket.close(3000);
    };

// pass environment
})(this, document, location);






