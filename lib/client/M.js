// global module loader
(function(instances, modules, models, views, wsCache, css, fn, win, doc) {
    
    // check browser features and route to a "update your browser site"
    if (!win.WebSocket || !win.history) {
        return win.location = 'http://browsehappy.com/';
    }
    
    // emit url event on popstate event
    win.addEventListener('popstate', function () {
        instances.M.route('', true);
    }, false);
    
    // create websocket
    var webSocket = new WebSocket('ws://' + win.location.host + '/');
    
    // load start instance when websocket is connected
    webSocket.onopen = function () {
        instances.M.inst();
    };
    
    // show reload message after socket closed
    webSocket.onclose = function () {
        if(confirm('Connection is lost. Click "OK" to reload.')) {
            win.location.reload();
        }
    };
    
    // parse websocket messages: ['instanceName:event:cbId','err','data']
    webSocket.onmessage = function (message) {
        
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }
        
        var err = message[1];
        var data = message[2];
        
        message = message[0].split(':');
        
        var instance = message[0];
        var event = message[1];
        var cbId = message[2];
        
        if (instance && event && instances[instance]) {
            
            // call callback
            if (wsCache[cbId]) {
                wsCache[cbId].call(instances[instance], err, data);
                delete wsCache[cbId];
            }
            
            // emit event
            instances[instance].emit(event, err, data);
        }
    };
    
    // module class
    var Module = {
        
        // listen to events
        on: listen,
        
        // listen to a event once
        one: function (event, handler, args, map, modules) {
            listen.call(this, event, handler, args, map, modules, true);
        },
        
        // remove listeners
        off: function (event, handler) {
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
        },
        
        // emit event
        emit: function(event) {
            var self = this;
            var events = self._events;
            
            // mark instance as ready
            if (event === 'ready') {
                this._ready = true;
            }
            
            // slice first argument
            var args = this.toArray(arguments).slice(1);
            
            for (var _event in events) {
                
                // compare event or test regex
                if (_event === event || events[_event].re.test(event)) {
                    
                    // TODO maybe ther's a better way to remove events and handlers
                    var rm = [];
                    
                    // merge static and dynamic arguments
                    if (events[_event].args) {
                        args = args.concat(events[_event].args);
                    }
                    
                    // add view to the route events
                    if (args[0] && args[0].pth && events[_event]._view > -1) {
                        // get map
                        args[0].view = args[0].pth[events[_event]._view];
                    }
                    
                    // load page modules
                    if (events[_event]._mods) {
                        for (var i = 0; i < events[_event]._mods.length; ++i) {
                            self.inst(events[_event]._mods[i]);
                        }
                        events[_event]._mods = null;
                    }
                    
                    for (var i = 0; i < events[_event].length; ++i) {
                        if (events[_event][i]) {
                            
                            // call registered Methods
                            events[_event][i].apply(self, args);
                            
                            // remove from event buffer, if once is true
                            if (events[_event][i].one) {
                                events[_event][i] = null;
                                rm.push([_event, i]);
                            }
                        }
                    }
                    
                    remove(events, rm);
                }
            }
        },
        
        // emit an event on a instance
        push: function (instance, event) {
            if (instances[instance]) {
                instances[instance].emit.apply(instances[instance], this.toArray(arguments).slice(1));
            }
        },
        
        // emit on all instances
        spill: function (event) {
            var args = this.toArray(arguments);
            for (var instance in instances) {
                instances[instance].emit.apply(instances[instance], args);
            }
        },
        
        // route to url
        route: function (url, fromPopstate) {
            // TODO what about the URL queries and hashes?
            // TODO relative urls ./ ../
            var self = this;
        
            // normalize pathname
            var pathname = location.pathname;
            pathname += pathname[pathname.length - 1] === '/' ? '' : '/';
            
            // normalize url
            url = url || pathname;
            url += url[url.length - 1] === '/' ? '' : '/';
            
            // // push state only when url changes
            if (url !== pathname) {
                history.pushState(0, 0, url);
            }
                
            // create state event object
            var stateEvent = {
                url: url,
                pth: url.split('/').slice(1, -1),
                pop: fromPopstate,
                ori: self.mono.name
            };
            
            // emit route events on all instances
            for (var instance in instances) {
                
                // emit only when a instance is ready and the url changed. emit always on the origin instance.
                if (!instances[instance]._ready || (instances[instance].mono.name !== stateEvent.ori && instances[instance]._url === url)) {
                    continue;
                }
                
                // set current url
                instances[instance]._url = url;
                
                // emit url route event
                instances[instance].emit.call(instances[instance], url, stateEvent);
                
                // emit general route event
                instances[instance].emit.call(instances[instance], 'route', stateEvent);
            }
        },
        
        // create a view instance
        view: function (name, callback) {
            var self = this;
            
            if (!name) {
                return;
            }
            
            if (!callback) {
                callback = callback || name;
                name = null;
            }
            
            // create empty view or with a config object
            if (!name|| typeof name === 'object') {
                return createViewInstance.call(self, null, name || {}, callback);
            }
            
            // check view cache
            var cacheKey = self.mono.name + name;
            if (views[cacheKey]) {
                return callback(null, views[cacheKey]);
            }
            
            // fetch view config from server
            self.emit('view>', 0, name, function (err, config) {
                
                if (err) {
                    return callback(err);
                }
                
                createViewInstance.call(self, cacheKey, config, callback);
            });
        },
        
        // load instance
        inst: function (instance, parentInstance) {
            var self = this;
            
            // get instance name from host
            var name = instance || win.location.hostname.replace(/\./g, '_');
            
            // don't load the same instance more than once
            if (instances[name]) {
                return;
            }
            
            // create emty module instance
            instance = instances[name] = self.clone(Module);
            
            // get instance config
            self.emit('inst>', null, name, function (err, config) {
                
                if (err) {
                    return console.error(err);
                }
                
                // add parent instance to waitFor config
                if (parentInstance) {
                    config.waitFor = config.waitFor || [];
                    config.waitFor.push(parentInstance);
                }
                
                // create module instance
                instance.mono = {
                    name: name,
                    config: config,
                    module: config.module
                };
                
                // attach send handler to instance configured client events
                if (config.events) {
                    for (var e = 0; e < config.events.length; ++e) {
                        instance.on('^' + config.events[e] + '$', createServerEventHandler(config.events[e]));
                    }
                }
                
                // load dependend modules
                if (config.modules) {
                    for (var m = 0; m < config.modules.length; ++m) {
                        instance.inst(config.modules[m], name);
                    }
                }
                
                // load scripts and init module
                if (config.scripts && config.scripts.length > 0) {
                    loadJS(config.module, config.scripts, function (moduleConstructor) {
                        
                        initModule(instance, moduleConstructor, function () {
                            
                            // listen to url events
                            if (config.routes) {
                                for (var i = 0, route; i < config.routes.length; ++i) {
                                    route = config.routes[i];
                                    instance.on(
                                        route.pattern,
                                        route.handler,
                                        route.args,
                                        route.view,
                                        route.modules
                                    );
                                }
                            }
                            
                            // emit route
                            instance.route();
                        });
                    });
                }
            });
        },
        
        // clone object
        clone: function (object) {
            var O = function() {};
            O.prototype = object || {};
            return new O();
        },
        
        // this.path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
        path: function (path, scope, stop) {
            
            var o = path;
            path = path.split('.');
            scope = scope || this;
            
            // find keys in paths or return
            for (var i = 0; i < path.length; ++i) {
                if (!(scope = scope[path[i]])) {
                    return stop ? null : this.path(o, win, true);
                }
            }
            
            return scope;
        },
        
        // convert object to arrays
        toArray: function (object) {
            return Array.prototype.slice.call(object);
        },
        
        // flat objects
        flat: function (object) {
            var output = {};
            
            function step(obj, prev) {
                for (var key in obj) {
                    var value = obj[key];
                    var newKey = prev ? prev + '.' + key : key;
                    
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        
                        if (Object.keys(value).length) {
                            step(value, newKey);
                            continue;
                        }
                    }
                    
                    output[newKey] = value;
                }
            }
            
            step(object);
            
            return output;
        },
        
        // random string generator
        uid: function (len) {
            len = len || 23;
            for (var i = 0, random = ''; i < len; ++i) {
                random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
            }
            return random;
        }
    };
    
    // -- \/ -------------------------------------------------------- VIEW CLASS
    
    // view class
    var View = {
        
        // render data to the html template
        render: function (data, leaveKeys, dontAppend) {
            var self = this;
            
            // check if a template exists
            if (!self._tp) {
                return;
            }
            
            self.html = '';
            self.data = data = data || [{}];
            
            // render data
            for (var i = 0; i < data.length; ++i) {
                
                // change data before it gets rendered to the html
                if (typeof self.on.data === 'function') {
                    data[i] = self.on.data(data[i]) || data[i];
                }
                
                self.html += self._tp(data[i] || {}, leaveKeys, self._mi);
            }
            
            // change html before writing it to the dom
            if (typeof self.on.html === 'function') {
                self.html = self.on.html(self.html) || self.html;
            }
            
            // write html to dom
            if (!dontAppend && self.dom) {
                self.dom.innerHTML = self.html;
                
                // append dom events
                self.addDomEvents();
            }
            
            // change html before writing it to the dom
            if (typeof self.on.done === 'function') {
                self.on.done(self);
            }
            
            return self;
        },
        
        // set a template function or a html snippet (which is converted in a template function)
        set: function (template, dom, scope) {
            var self = this;
            self._tp = typeof template === 'function' ? template : createTemplate(template);
            
            if (dom) {
                self.dom = typeof dom === 'string' ? (scope || document).querySelector(dom) : dom;
            }
        },
        
        // send model request
        req: function (data, callback) {
            var self = this;
            
            // emit server event
            self._mi.emit('model_req>', null, {
                m: self.model,
                d: data
            }, function (err, data) {
                
                if (err) {
                    return callback(err);
                }
                
                // render data
                self.render(data);
                
                callback(null, data);
            });
        },
        
        // append dom event handlers
        addDomEvents: function (config) {
            var self = this;
            
            config = config || self.events;
            
            if (!self.dom || !config) {
                return;
            }
            
            // loop through selectors
            for (var selector in config) {
                var elms = self.dom.querySelectorAll(selector);
                
                // loop through dom elements
                for (var i = 0; i < elms.length; ++i) {
                    
                    // loop through events
                    for (var event in config[selector]) {
                        
                        // loop through methods
                        for (var m = 0, listener, method; m < config[selector][event].length; ++m) {
                            
                            method = config[selector][event][m];
                            
                            // add event listener
                            listener = self._mi.path(method.fn);
                            if (typeof listener === fn) {
                                elms[i].addEventListener(event, domEventHandler(self, self.data[i], listener, method.args), false);
                            }
                        }
                    }
                }
            }
        }
    };
    
    // ---------------------------------------------------------- VIEW FUNCTIONS
    
    // keep scope in dom events
    function domEventHandler (self, item, listener, args) {
        
        // copy config arguments
        args = args ? args.slice() : [];
        
        // create view event object and unshift it to args
        args.unshift({
            view: self,
            item: item
        });
        
        return function (event) {
            
            // add event object to view event
            args[0].event = event;
            
            // call listener with scope from the instance
            listener.apply(self._mi, args);
        };
    }
    
    function createViewInstance (cacheKey, config, callback) {
        var self = this;
        
        // create view instance
        var view = self.clone(View);
        view._mi = self;
        view.on = {};
        
        // TODO change config.data to config.config
        view.config = config.data || {};
        
        view.events = config.events || {};

        // append custom handlers
        if (config.on) {
            for (var event in config.on) {
                view.on[event] = self.path(config.on[event]);
            }
        }
        
        loadCss(config.css);
        
        if (config.html) {
            // set html template
            view.set(config.html, config.to, config['in']);
        }
        
        // load model
        if (config.model) {
            
            var modelCache = config.model;
            
            // special case for admin purposes
            if (config.project) {
                config.project = win.location.pathname.split('/').slice(1, -1)[config.project];
                if (!config.project) {
                    return callback('[model: Project name not found]');
                }
                
                // update model cache key
                modelCache = config.project + config.model;
                
                // update model query
                config.model = [config.model, config.project];
            }
            
            // check model cache
            if (models[modelCache]) {
                return callback(null, buildView(cacheKey, modelCache, view));
            }
            
            // fetch model config from server
            self.emit('model>', 0, config.model, function (err, schema) {
                
                if (err) {
                    return callback(err);
                }
                
                // save flat schema in models cache
                models[modelCache] = self.flat(schema);
                
                callback(null, buildView(cacheKey, modelCache, view));
            });
        
        } else {
            callback(null, buildView(cacheKey, null, view));
        }
    }
    
    function buildView (cacheKey, modelCache, view) {
        
        // extend view with model
        view.schema = models[modelCache];
        view.model = modelCache;
        
        // save instance to cache
        if (cacheKey) {
            views[cacheKey] = view;
        }
        
        return view;
    }
    
    // create a template function
    function createTemplate (html) {
        
        // create template
        // credentials: http://github.com/mood/riotjs/lib/render.js
        html = html.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/'/g, "\\'");
        html = new Function('d','k','i',
            "var v;return '" + html.replace(/\{\s*([\w\.]+)\s*\}/g, "'+("+
            "(v='$1'.indexOf('.')>0?i.path('$1',d):d['$1'])?(v+'')" +
            ".replace(/&/g,'&amp;')" +
            ".replace(/'/g,'&quot;')" +
            ".replace(/</g,'&lt;')" +
            ".replace(/>/g,'&gt;')" +
            ":v===0?0:(k?'{$1}':''))+'") + "'"
        );
        
        return html;
    }
    
    // load css files
    function loadCss (urls) {
        if (urls) {
            for (var i in urls) {
                // path are always absolute
                urls[i] = urls[i][0] !== '/' ? '/' + urls[i] : urls[i];
                
                if (!css[urls[i]]) {
                    css[urls[i]] = 1;
                    
                    var link = document.createElement('link');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', urls[i]);
                    document.head.appendChild(link);
                }
            }
        }
    }
    
    // -- /\ -------------------------------------------------------------------
    
    // -- \/ ------------------------------------------------ OBSERVER FUNCTIONS
    
    // add listeneres   
    function listen (event, handler, staticArgs, view, modules, once) {
        var self = this;
        var events = self._events = self._events || {};
        
        // get handler from a path
        if (typeof handler !== fn) {
            handler = self.path(handler);
        }
        
        if (typeof handler === fn) {
            // fire ready event immediately if instance is ready
            if (event === 'ready' && self._ready) {
                return handler.call(self);
            }
            
            if (!events[event]) {
                events[event] = [];
                
                // create regexp pattern
                events[event].re = new RegExp(event);
                events[event].args = staticArgs || [];
                
                // add map config to event
                if (view > -1) {
                    events[event]._view = view;
                }
                
                // add modules to load to event
                if (modules) {
                    events[event]._mods = modules;
                }
            }
            
            handler.one = once;
            events[event].push(handler);
        }
    }
    
    // remove listeners
    function remove (events, rmObject) {
        if (rmObject.length) {
            for (i = 0; i < rmObject.length; ++i) {
                if (events[rmObject[i][0]]) {
                    events[rmObject[i][0]].splice(rmObject[i][0], 1);
                }
            }
        }
    }
    
    // ------------------------------------------------- MODULE LOADER FUNCTIONS
    
    // paralell loading callback
    function paralellReadyHandler (mods, callback) {
        
        if (mods instanceof Array) {
            var count = mods.length;
            var current = 0;
            var handler = function () {
                if (++current === count) {
                    callback();
                }
            };
            
            for (var i = 0; i < count; ++i) {
                instances[mods[i]].one('ready', handler);
            }
        } else {
            callback();
        }
    }
    
    // load scripts
    function initModule (instance, init, callback) {
        
        // call module init
        if (typeof init === fn) {
            
            var i = 0;
            
            // handle subReady event
            if (instance.mono.config.modules) {
                paralellReadyHandler(instance.mono.config.modules, function () {
                    
                    instance.emit('subReady');
                    
                    if (++i === 2) {
                        callback();
                    }
                });
            } else {
                ++i;
            }
            
            // handle waitFor
            paralellReadyHandler(instance.mono.config.waitFor, function () {
                init.call(instance);
            });
            
            // listen for instance ready to handle callback
            instance.one('ready', function () {
                if (++i === 2) {
                    callback();
                }
            });
        }
    }
    
    // -------------------------------------------------- SERVER EVENT FUNCTIONS
    
    // create websocket message: ['instanceName:event:cbId','err','data']
    function createServerEventHandler (event) {
        return function (err, data, callback) {
            
            var message = [this.mono.name + ':' + event, err || 0];
            var cbId;
            
            if (data) {
                message[2] = data;
            }
            
            if (callback) {
                cbId = this.uid(5);
                message[0] += ':' + cbId;
                wsCache[cbId] = callback;
            }
            
            try {
                message = JSON.stringify(message);
            } catch (parseError) {
                if (callback) {
                    callback(parseError);
                }
                return;
            }
            
            webSocket.send(message);
        };
    }
    
    // ------------------------------------------------- SCRIPT LOADER FUNCTIONS
    
    // commonjs require
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
            } else {
                
                if (name.split('/').length < 5 && name[name.length - 1] !== '/') {
                    name += '/';
                }
                
                for (var script in modules) {
                    if (script.indexOf(name) === 0) {
                        name = script;
                        break;
                    }
                }
            }
            
            name += name.slice(-3) !== '.js' ? '.js' : '';
            if (modules[name]) {
                return modules[name].exports;
            }
        };
    }
    
    // create CommonJS modules in order of the dependencies-
    function createCommonJsModulesInOrder (moduleSources, callback) {
        
        // init modules in order (desc)
        for (var i = (moduleSources.length - 1), l = 0; i >= l; --i) {
            
            // evaluate module script
            if (typeof modules[moduleSources[i]] === fn && !modules[moduleSources[i]]._eval) {
                    
                    var module = {
                        id: moduleSources[i],
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
                    modules[moduleSources[i]] = modules[moduleSources[i]].call(module.exports, require(module), module, module.exports);
                    modules[moduleSources[i]]._eval = true;
            }
        }
        
        // return first module of dependency list
        callback(modules[moduleSources[0]] ? modules[moduleSources[0]].exports : null);
    }

    // load handler for external dependencies
    function extDepLoaded (src) {
        return function () {
            modules[src] = 2;
            instances.M.emit(src);
        };
    }

    // load scripts (script tag)
    function loadJS (moduleName, moduleSources, callback) {
 
        var length = moduleSources.length;
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(moduleSources, callback);
            }
        };
        
        for (var i = length - 1, source, url; i >= 0; --i) {
            
            source = moduleSources[i];
            
            // ingore loading for unified code 
            if (source[0] === '#') {
                // remove the control sign
                moduleSources[i] = source.indexOf('./') === 1 ? source.substr(3) : source.substr(1);
                --length;
                continue;
            }
            
            // load module files
            if (source.indexOf('./') === 0) {
                moduleSources[i] = source = moduleName + source.substr(2);
            }
            
            // when script is loaded check if it's evaluated
            instances.M.one(source, modDepLoaded);
            
            // emit source event for already loaded scripts
            if (modules[source] && modules[source] !== 1) {
                instances.M.emit(source);
            
            // load module scripts
            } else if (!modules[source]) {
                modules[source] = 1;
                var node = doc.createElement('script');
                
                url = '/@/M/mod/' + source;
                
                // handle external scripts onload event
                if (source[0] === '/' || source.indexOf('://') > 0) {
                    node.onload = extDepLoaded(source);
                    url = source;
                }
                
                node.src = url;
                doc.head.appendChild(node);
            }
        }
    }
    
    // -- /\ -------------------------------------------------------------------
    
    // -- \/ ---------------------------------------------- CORE MODULE INSTANCE
    
    // create core module instance
    instances.M = Module.clone(Module);
    instances.M.mono = {name: 'M'};
    instances.M._ready = true;
    
    // setup 'inst>' as server event
    instances.M.on('inst>', createServerEventHandler('inst>'));
    
    // -- /\ -------------------------------------------------------------------
    
    // export global funtionality 
    win.M = {
        
        // export wrapping function
        wrap: function (path, module) {
            modules[path] = module;
            instances.M.emit(path);
        },
        
        // reload module instances
        // TODO check memory leaks
        reload: function () {
        
            // reset instances, but backup core instance
            instances = {M : instances.M};
            
            // reset websockets callback cache
            wsCache = {};
            
            // reset models cache
            models = {};
            
            // reset views cache
            views = {};
            
            // reset html
            doc.body.innerHTML = '';
            
            // load root instance
            instances.M.inst();
        }
    };
    
})({}, {}, {}, {}, {}, {}, 'function', window, document);
