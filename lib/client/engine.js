// observer module
(function (global, body, state) {

    // check browser features and route to a "update your browser site"
    if (!global.WebSocket || !global.history) {
        global.location = 'http://browsehappy.com/';
        return;
    }

    /**
     * Listen on url change (popstate) and emit a new route.
     *
     * @private
     */
    global.addEventListener('popstate', function () {
        engine.route('', {}, true);
    }, false);

    /**
     * Wrapper function for CommonJS modules.
     *
     * @public
     * @param {string} The complete file path.
     * @param {function} The wrapper function, which returns the module object
     */
    var engine = global.E = function Engine (path, module) {
        engine.scripts[path] = module;
        engine.emit(path);
    };

    var cur_location;

    /**
     * The module class.
     *
     * @class Module
     */
    var Module = {
        emit: emit,
        on: on,
        off: off
    };

    // default config
    engine._module = 'E'

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

    // make engine observable
    engine.emit = emit;
    engine.on = on;
    engine.off = off;
    engine._events = {};

    /**
     * Emit an event.
     *
     * @public
     * @param {object|string} The even name or object, which is emitted.
     * @param {mixed} The following arguments are passed to the event handlers.
     */
    function emit (event) {

        var instance = this;
        var _event = event;

        // handle emit
        if (typeof event === 'object') {

            // set event as event name
            _event = event.state || event.event;

            // get new scope and return if scope doesn't exists
            if(event.to && !(instance = engine.instances[event.to])) {
                return;
            }

            // set instance to null, to emit on all instances
            instance = event.all ? null : instance;
        }

        // slice first argument
        var args = arguments.length > 1 ? engine.toArray(arguments).slice(1) : [];

        // fire events on a single instance
        if (instance) {
            return fireEvents(instance, _event, args);
        }

        // fire events on all instances
        for (instance in engine.instances) {
            fireEvents(engine.instances[instance], _event, args, event.state);
        }
    }

    /**
     * Fire all matching events on a module instance.
     *
     * @public
     * @param {object} The module instance, on which the events are emitted.
     * @param {string} The event name.
     * @param {array} The arguments for the event handlers.
     */
    function fireEvents (instance, event, args, state) {

        // state specifc checks
        if (state) {

            // ignore events, if the instance state doesn't change
            if (instance._state === state) {
                return;
            }

            // set current state on instance
            instance._state = event;
        }

        // index for events that must be removed
        var rm = [];

        // instance events
        var events = instance._events;

        // instance event loop
        for (var _event in events) {

            // compare event or test regex
            if (_event === event || events[_event].re.test(event)) {

                // call handlers
                for (var i = 0; i < events[_event].length; ++i) {
                    if (events[_event][i]) {

                        // call registered Methods
                        events[_event][i].apply(self, args);

                        // remove from event buffer, if once is true
                        if (events[_event][i]._1) {
                            events[_event][i] = null;
                            rm.push([_event, i]);
                        }
                    }
                }

                // routes on the same instance are unique, this prevents
                // regexp overlapping on complicated routes
                if (args[0] && args[0]._rt && !events[_event].nr) {
                    break;
                }
            }
        }

        // remove unused events
        remove(events, rm);
    }

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
    function on (event, handler, once, noRoute) {

        var events = this._events;

        // get handler from a path
        if (typeof handler !== 'function') {
            handler = engine.path(handler, [this]);
        }

        if (typeof handler === 'function') {

            if (!events[event]) {
                events[event] = [];

                // create regexp pattern
                events[event].re = new RegExp(event);
                events[event].nr = noRoute;
            }

            handler._1 = once;
            events[event].push(handler);
        }
    }

    /**
     * Remove an event or a single event hanlder from the event loop.
     *
     * @public
     * @param {string} The even name regular expression pattern.
     * @param {function} The event handler.
     */
    function off (event, handler) {

        var events = this._events;

        if (events[event]) {

            if (handler) {
                var rm = [];

                for (var i = 0; i < events[event].length; ++i) {
                    if (events[event][i] === handler) {
                        events[event][i] = null;
                        rm.push([event, i]);
                    }
                }

                remove(events, rm);

            } else {
                delete events[event];
            }
        }
    }

    /**
     * Removes the collected events from an observable.
     *
     * @private
     * @param {object} The events of an observable.
     * @param {array} The infos for removing events.
     */
    function remove (events, rmObject) {

        if (rmObject.length) {
            for (i = 0; i < rmObject.length; ++i) {

                // remove handler
                events[rmObject[i][0]].splice(rmObject[i][0], 1);

                // remove event
                if (events[rmObject[i][0]].length === 0) {
                    delete events[rmObject[i][0]];
                }
            }
        }
    }

    /**
     * Emit a route state on all instances and update the browser history.
     *
     * @public
     *
     * @param {string} The url or state name, which is emitted.
     * @param {object} The data object, which is passed to the event.
     * @param {boolean} Indicates if the route is called form a popstate event.
     */
    engine.route = function (url, data, fromPopstate) {

        var path = state.pathname;
        var current = state.href.split(/^(.*:)\/\/([a-z\-.]+)(:[0-9]+)?(.*)$/)[4];
        var prev_location;

        data = data || {};

        // dynamic urls
        if (url && url.indexOf('/*') > -1) {
            // get path, search and hash
            var pathname = path.split('/');
            var dyn_url = url.split('/');

            for (var i = 0; i < dyn_url.length; ++i) {
                if (dyn_url[i] === '*' && pathname[i]) {
                    dyn_url[i] = pathname[i];
                }
            }

            url = dyn_url.join('/');
        }

        // emit current url if url is false
        url = url || current;

        // push state only when url changes
        if (fromPopstate || (url !== current)) {

            // update previous location
            prev_location = JSON.parse(JSON.stringify(cur_location));
        }

        // push url to browser history
        if (url !== current) {
            global.history.pushState(0, 0, url);
        }

        // update current location
        cur_location = {
            url: url,
            path: path,
            hash: state.hash,
            search: state.search
        };

        // create state event object
        var stateEvent = {
            pop: fromPopstate,
            prev: prev_location,
            _rt: true
        };

        // emit url state on all instances
        engine.emit({state: url, all: true}, stateEvent, data);
    };

    /**
     * Load module scripts and depedencies.
     *
     * @public
     * @param {string} The name of the module.
     * @param {number} The index of the main module script.
     * @param {array} The module script paths.
     * @param {function} The callback handler, which returns the module object.
     */
    engine.load = function (scripts, module_instance, callback) {

        // get the module name
        var moduleName = module_instance._module;

        // get the number of scripts
        var length = scripts.length;

        // ensure callback
        callback = callback || function () {};

        // create CommonJS module, when all scrips are loaded
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(scripts, module_instance, callback);
            }
        };

        // loop through scripts
        for (var i = length - 1, url, cleanPath, fingerprint; i >= 0; --i) {

            url = scripts[i];

            // split path
            cleanPath = url.split('.');

            // get fingerprint and remove fingerprint from read path
            fingerprint = cleanPath.splice(cleanPath.length - 2, 1)[0];

            // create path without fingerprint
            cleanPath = cleanPath.join('.');

            // complete url and clean path
            if (cleanPath.indexOf('./') === 0) {
                url = '/@/0/script/' + moduleName + '/' + url.substr(2);
                cleanPath = moduleName + '/' + cleanPath.substr(2);
            }

            // overwrite script path with path without fingerprints
            scripts[i] = cleanPath;

            // when script is loaded check if it's evaluated
            engine.on(cleanPath.replace(/\|/g, '\\\|'), modDepLoaded, 1);

            // emit source event for already loaded scripts
            if (engine.scripts[cleanPath] && engine.scripts[cleanPath] !== 1) {
                engine.emit(cleanPath);

            // load module scripts
            } else if (!engine.scripts[cleanPath]) {
                engine.scripts[cleanPath] = 1;
                var node = body.createElement('script');

                // check if it's an external source
                if (cleanPath.indexOf('//') > -1) {
                    node.onload = extDepLoaded(cleanPath);
                }

                // add fingerprint to the url
                node.src = url;
                body.head.appendChild(node);
            }
        }
    };

    /**
     * Load handler for external dependencies
     *
     * @private
     * @param {string} The source url.
     */
    function extDepLoaded (src) {
        return function () {

            // set script status to "external loaded"
            engine.scripts[src] = 2;

            // emit the source event
            engine.emit(src);
        };
    }

    /**
     * Initialize CommonJS modules in order of the dependencies.
     *
     * @private
     * @param {object} .
     */
    function createCommonJsModulesInOrder (scripts, module_instance, callback) {

        // init modules in order (desc)
        for (var i = (scripts.length - 1), l = 0; i >= l; --i) {

            // evaluate module script
            if (typeof engine.scripts[scripts[i]] === 'function' && !engine.scripts[scripts[i]]._eval) {

                    var module = {
                        id: scripts[i],
                        exports: {}
                    };

                    module.path = module.id.split('/');
                    module.file = module.path.pop();

                    if (module.id.indexOf('//') === 0) {

                        module.base = '//';
                        module.path = module.path.slice(2);

                    } else if (module.id[0] === '/') {

                        module.base = '/';
                        module.path = module.path.slice(1);

                    } else if (module.id.indexOf('://') > 0) {

                        module.base = module.path.slice(0,3).join('/') + '/';
                        module.path = module.path.slice(3);

                    } else {

                        module.base = module.path.slice(0,4).join('/') + '/';
                        module.path = module.path.slice(4);
                    }

                    // execute CommonJS module
                    engine.scripts[scripts[i]] = engine.scripts[scripts[i]].call(module.exports, require(module), module, module.exports);
                    engine.scripts[scripts[i]]._eval = true;
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
     * The CommentJS require function.
     *
     * @private
     * @param {object} The module object.
     */
    function require (module) {
        return function (name) {
            if (name.indexOf('../') === 0) {

                var namePath = name.split('../');
                var stepBackLenght = namePath.length - 1;
                namePath = namePath.pop();

                name = module.base + (module.path.length === stepBackLenght ? namePath : module.path.slice(0, stepBackLenght).join('/') + '/' + namePath);

            } else if (name.indexOf('./') === 0) {
                var path = module.path.join('/');
                name = module.base + (path ? path + '/' : '') + name.substr(2);
            }

            name += name.slice(-3) !== '.js' ? '.js' : '';
            if (engine.scripts[name]) {
                return engine.scripts[name].exports;
            }
        };
    }

    /**
     * Connect to the server and start listening to messages.
     *
     * @public
     */
    engine.listen = function () {

        // extend module with the link factory
        Module.link = engine.link;

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
    };

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
        var module_instance = engine.clone(Module);

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
            module_instance._config = config.config;

            // save the flow config for internal events (engine observer)
            module_instance._flow = config.flow;

            // save the flow config for external events (ex. DOM events)
            module_instance._extFlow = config.extFlow;

            // save module name
            module_instance._name = config.name || name;

            // save module name on module instance
            module_instance._module = config.module;

            // save module instance with configured name in cache
            if (!name) {
                engine.instances[config.name] = module_instance;
            }

            // load css
            config.css && engine.css(config.css);

            // load sub modules
            if (config.load) {

                for (var i = 0; i < config.load.length; ++i) {
                    engine.module(config.load[i], tempLoadingCache);
                }
            }

            // load html snippets
            if (config.html) {

                // increment loading count
                --tempLoadingCache.count;

                // load html snippets
                engine.html(config.html, function (err) {
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
    function loadHandler (err, tempLoadingCache) {

        // emit error event
        if (err) {
            return engine.emit('moduleLoadError', err);
        }

        // check if all module instances are loaded
        if (++tempLoadingCache.count === tempLoadingCache.length) {

            // initialize module instances
            for (var i = 0, flow; i < tempLoadingCache.length; ++i) {

                // get flow configuration
                flow = tempLoadingCache[i]._flow;

                // setup event flow
                if (flow) {

                    for (var l = 0, listen; l < flow.length; ++l) {
                        listen = flow[l];

                        // listen to events
                        tempLoadingCache[i].on(
                            listen['in'],
                            engine.flow(tempLoadingCache[i], listen.out),
                            listen['1'],
                            listen.noRoute
                        );
                    }
                }

                // call the factory method if it exists
                tempLoadingCache[i].init && tempLoadingCache[i].init();

                // emit the ready event
                tempLoadingCache[i].emit('ready');
            }

            // emit route event
            engine.route();
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

        for (var i in urls) {
            if (!engine.csss[urls[i]]) {
                engine.csss[urls[i]] = 1;

                var link = body.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('href', urls[i]);
                body.head.appendChild(link);
            }
        }
    };

    /**
     * Empties all caches and reloads the modules.
     *
     * @public
     * @param {boolean} Don't remove the DOM nodes.
     * @todo check for memory leaks
     */
    engine.reload = function (keepDom) {

        // close the websocket
        engine.socket.close();

        // reset module cache
        engine.scripts = {};
        engine.instances = {};
        engine._links = {};
        engine._events = {};
        engine.csss = {};

        // reset html
        if (!keepDom) {
            body.body.innerHTML = '';
        }

        // start client server
        engine.listen();
    };

// pass environment
})(this, document, location);
