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

    // regular expression patterns
    var find_tmpl = /{([\w\.]+)}/g;
    var find_braces = /\{|\}/g;
    var cur_location;

    /**
     * The module class.
     *
     * @class Module
     */
    var Module = {
        emit: engine.emit,
        on: engine.on,
        off: engine.off,
        _events: {},
        link: engine.link
    };

    // cache for active links
    engine._links = {};

    // module instance cache
    engine.modules = {};

    // script cache
    engine.scripts = {};

    // css cache
    engine.csss = {};

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
            if(event.to && !(instance = engine.modules[event.to])) {
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
        for (instance in engine.modules) {
            fireEvents(engine.modules[instance], _event, args, event.state);
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
            handler = engine.path(handler);
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
            path: win_location.pathname,
            hash: win_location.hash,
            search: win_location.search
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
    engine.load = function (moduleName, scripts, callback) {

        // get the number of scripts
        var length = scripts.length;

        // ensure callback
        callback = callback || function () {};

        // create CommonJS module, when all scrips are loaded
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(scripts, callback);
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
                cleanPath = scripts[i] = moduleName + '/' + cleanPath.substr(2);
            }

            // when script is loaded check if it's evaluated
            engine.on(cleanPath, modDepLoaded, 1);

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
    function createCommonJsModulesInOrder (scripts, callback) {

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

        // return first module of dependency list
        callback(null, engine.scripts[scripts[0]] && engine.scripts[scripts[0]].exports);
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
     */
    engine.module = function (name, sub) {
        var self = this;

        // check modules cache
        if (engine.modules[name]) {
            return;
        }

        // create a new empty Module
        var module = engine.clone(Module);

        // save module instance in cache to prevent overlapping requests
        if (name) {
            engine.modules[name] = module;
        }

        // module instances link cache
        module._links = {};

        // create a link
        var link = engine.link('load', function (err, config) {

            // handle error
            if (err) {

                // remove module from cache
                delete engine.modules[name];

                // emit error event
                return self.emit('moduleLoadError', err);
            }

            // load css
            config.css && engine.css(config.css);

            // load scripts
            config.scripts && engine.load(config.module, config.scripts, loadHandler);

            // load sub modules
            if (config.load) {
                for (var i = 0; i < config.load.length; ++i) {
                    engine.module(config.load[i], true);
                }
            }

            // create event object
            module._events = {};

            // save module name
            module._name = config.name || name;

            // save module name on module instance
            module._module = config.module;

            // save module instance with configured name in cache
            if (config.name && !engine.modules[config.name]) {
                engine.modules[config.name] = module;
            }
        });

        // send module instance name
        link.send(null, name);
    };

    /**
     * Handles the initialization order for sub modules.
     *
     * @public
     * @param {object|string} The even name or object, which is emitted.
     * @param {mixed} The following arguments are passed to the event handlers.
     */
    function loadHandler (module) {

        console.log(engine.modules);
        console.log(arguments, 'loadHandler');
    }

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
     * Emties all caches and reloads the modules.
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
        engine.modules = {};
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

    /**
     * Replace data fields in a string.
     *
     * @private
     * @param {string} The string.
     * @param {object} The data context.
     */
    function parsePath (path, event) {
        var self = this;
        var match = path.match(find_tmpl);

        // replace route with data
        if (match) {
            for (var i = 0, value; i < match.length; ++i) {

                // get value from object
                value = self._path(match[i].replace(find_braces, ''), event);

                // replace value in route
                if (typeof value !== 'undefined') {
                    path = path.replace(match[i], value);
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
    function searchToJSON(){
        var rep = {'?':'{"','=':'":"','&':'","'};
        var s = state.search.replace(/[\?\=\&]/g, function(r) {
            return rep[r];
        });
        return JSON.parse(s.length? s+'"}' : "{}");
    }

// pass environment
})(this, document, location);
