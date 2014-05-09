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
        one: function (event, handler, args, map) {
            listen.call(this, event, handler, args, map, true);
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
            var events = this._events;
            
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
                    args = args.concat(events[_event].args);
                    
                    // add map to the route events
                    if (args[0] && args[0].url && events[_event]._map) {
                        // get map
                        args[0].map = this.mapUrl(events[_event].re, events[_event]._map);
                    }
                    
                    for (var i = 0; i < events[_event].length; ++i) {
                        if (events[_event][i]) {
                            
                            // call registered Methods
                            events[_event][i].apply(this, args);
                            
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
        
        // create a model instance
        model: function (name, project, callback) {
            var self = this;
            
            if (!name) {
                return callback('no model name given.');
            }
            
            // create cache key
            var cacheKey = name;
            
            // check arguments
            if (arguments.length > 2) {
                name = [name, project];
                cacheKey = project + cacheKey;
            } else {
                callback = project;
            }
            
            // check model cache
            if (models[cacheKey]) {
                return callback(null, models[cacheKey]);
            }
            
            // fetch model config from server
            self.emit('model>', 0, name, function (err, config) {
                
                if (err) {
                    return callback(err);
                }
                
                // create model instance
                var model = {
                    
                    // properties
                    id: config._id,
                    name: name,
                    project: project,
                    schema: config.schema,
                    fields: self.flat(config.schema),
                
                    // model request handler
                    req: function (data, callback) {
                        self.emit('model_req>', null, {
                            m: cacheKey,
                            d: data
                        }, callback);
                    }
                };
                
                // save instance to cache
                models[cacheKey] = model;
                
                callback(null, model);
            });
        },
        
        // create a view instance
        view: function (name, project, callback) {
            var self = this;
            
            if (!name) {
                return callback('no view name given.');
            }
            
            // create cache key
            var cacheKey = name;
            
            // check arguments
            if (arguments.length > 2) {
                name = [name, project];
                cacheKey = project + cacheKey;
            } else {
                callback = project;
            }
            
            // check view cache
            if (views[cacheKey]) {
                return callback(null, views[cacheKey]);
            }
            
            // fetch view config from server
            self.emit('view>', 0, name, function (err, config) {
                
                if (err) {
                    return callback(err);
                }
                
                // create view instance
                var view = self.clone(View);
                view._mi = self;
                view.on = {};
        
                // append custom handlers
                if (config.on) {
                    for (var event in config.on) {
                        view.on[event] = self.path(config.on[event]);
                    }
                }
                
                // TOOD change view config and remove tempalte key
                if (config.template) {
                    
                    loadCss(config.template.css);
                    
                    // save dom target on template
                    if (config.template.to) {
                        view.dom = (config.template.in || doc).querySelector(config.template.to);
                    }
                    
                    // set html template
                    if (config.template.html) {
                        view.set(config.template.html);
                    }
                }
                
                // save instance to cache
                views[cacheKey] = view;
                
                callback(null, view);
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
                
                // setup 'inst>' as server event
                instance.on('inst>', createServerEventHandler('inst>'));
                
                // setup 'model>' as server event
                instance.on('model>', createServerEventHandler('model>'));
                
                // setup 'view>' as server event
                instance.on('view>', createServerEventHandler('view>'));
                
                // load dependend modules
                if (config.modules) {
                    for (var i = 0; i < config.modules.length; ++i) {
                        instance.inst(config.modules[i], name);
                    }
                }
                
                // load scripts and init module
                if (config.scripts && config.scripts.length > 0) {
                    loadJS(config.module, config.scripts, function (moduleConstructor) {
                        
                        // attach send handler to instance configured client events
                        if (config.events) {
                            for (var i = 0, l = config.events.length; i < l; ++i) {
                                instance.on(config.events[i], createServerEventHandler(config.events[i]));
                            }
                        }
                        
                        initModule(instance, moduleConstructor, function () {
                            
                            // listen to url events
                            if (config.routes) {
                                for (var i = 0, l = config.routes.length; i < l; ++i) {
                                    instance.on(
                                        config.routes[i].pattern,
                                        config.routes[i].handler,
                                        config.routes[i].args,
                                        config.routes[i].map
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
        },
        
        // map a regular expression to an object
        mapUrl: function (pattern, map) {
            var match = location.pathname.match(pattern);
            var output = {};
            
            if (!match) {
                return;
            }
            
            // create output
            for (var key in map) {
                if (map[key] instanceof Array) {
                    // TODO make prefix optional (index 0 can also be the index for the match array)
                    output[key] = map[key][0] + match[map[key][1]] + (map[key][2] || '');
                } else {
                    output[key] = match[map[key]];
                }
            }
            
            return output;
        }
    };
    
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
            data = data || [{}];
            
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
            }
            
            // change html before writing it to the dom
            if (typeof self.on.done === 'function') {
                self.on.done(self);
            }
            
            return self;
        },
        
        // set a template function or a html snippet (which is converted in a template function)
        set: function (template) {
            var self = this;
            self._tp = typeof template === 'function' ? template : createTemplate(template);
        }
    };
    
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
    
    // -- \/ ------------------------------------------- MODULE LOADER FUNCTIONS
    
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
    
    // ------------------------------------------------------ OBSERVER FUNCTIONS
    
    // add listeneres   
    function listen (event, handler, staticArgs, map, once) {
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
                if (map) {
                    events[event]._map = map;
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
            
            // reset html
            doc.body.innerHTML = '';
            
            // load root instance
            load();
        }
    };
    
})({}, {}, {}, {}, {}, {}, 'function', window, document);
