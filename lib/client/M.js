// global module loader
(function(instances, modules, wsCache, fn, win, doc) {
    
    // check browser features and route to a "update your browser site"
    if (!win.WebSocket || !win.history) {
        return win.location = 'http://browsehappy.com/';
    }
    
    // emit url event on popstate event
    win.addEventListener('popstate', function () {
        instances.M.route('', true);
    }, false);
    
    // connect websocket and load the root instance when socket is connected
    var webSocket = new WebSocket('ws://' + win.location.host + '/');
    webSocket.onopen = function () {
        load();
    };
    
    // TODO try to reconnect after socket closed form server
    // TODO also when the internet connnection is down
    
    // module class
    var Mono = {
        // listen to events
        on: listen,
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
            var args = convertToArray(arguments).slice(1);
            
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
                        args[0].map = mapUrl(events[_event].re, events[_event]._map);
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
                instances[instance].emit.apply(instances[instance], convertToArray(arguments).slice(1));
            }
        },
        // emit on all instances
        spill: function (event) {
            var args = convertToArray(arguments);
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
        
        // Object.paht('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
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
        }
    };
    
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
    
    // map a regular expression to an object
    function mapUrl (pattern, map) {
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
    
    function convertToArray (object) {
        return Array.prototype.slice.call(object);
    }
    
    // create websocket message: ['instanceName:event:cbId','err','data']
    function send (event) {
        return function (err, data, callback) {
            
            var message = [this.mono.name + ':' + event, err || 0];
            var cbId;
            
            if (data) {
                message[2] = data;
            }
            
            if (callback) {
                cbId = uid(5);
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
    
    // clone object
    function clone (object) {
        var O = function() {};
        O.prototype = object || {};
        return new O();
    }
    
    // random string generator
    function uid (len) {
        len = len || 23;
        for (var i = 0, random = ''; i < len; ++i) {
            random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
        }
        return random;
    }
    
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
    
    // create CommonJS modules in order of the dependencies
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
    
    // load instance
    function load (instance, parentInstance) {
        
        // get instance name from host
        instance = instance || win.location.hostname.replace(/\./g, '_');
        
        // don't load the same instance more than once
        if (instances[instance]) {
            return;
        }
        
        // create emty module instance
        instances[instance] = clone(Mono);
        
        // get instance config
        instances.M.emit('inst>', null, instance, function (err, config) {
            
            if (err) {
                return console.error(err);
            }
            
            // load dependend modules
            if (config.modules) {
                for (var i = 0; i < config.modules.length; ++i) {
                    M(config.modules[i], instance);
                }
            }
            
            // add parent instance to waitFor config
            if (parentInstance) {
                config.waitFor = config.waitFor || [];
                config.waitFor.push(parentInstance);
            }
            
            // create module instance
            instances[instance].mono = {
                name: instance,
                config: config,
                module: config.module
            };
            
            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                loadJS(config.module, config.scripts, function (moduleConstructor) {
                    
                    // attach send handler to instance configured client events
                    if (config.events) {
                        for (var i = 0, l = config.events.length; i < l; ++i) {
                            instances[instance].on(config.events[i], send(config.events[i]));
                        }
                    }
                    
                    initModule(instances[instance], moduleConstructor, function () {
                        
                        // listen to url events
                        if (config.routes) {
                            for (var i = 0, l = config.routes.length; i < l; ++i) {
                                instances[instance].on(
                                    config.routes[i].pattern,
                                    config.routes[i].handler,
                                    config.routes[i].args,
                                    config.routes[i].map
                                );
                            }
                        }
                        
                        // emit route
                        instances[instance].route();
                    });
                });
            }
        });
    }
    
    // export wrapping function
    load.wrap = function (name, module) {
        modules[name] = module;
        instances.M.emit(name);
    };
    
    // export clone function
    load.clone = clone;
    
    // export uid function
    load.uid = uid;
    
    // reload module instances
    // TODO check memory leaks
    load.reload = function () {
    
        // reset instances, but backup core instance
        instances = {M : instances.M};
        
        // reset websockets callback cache
        wsCache = {};
        
        // reset html
        doc.body.innerHTML = '';
        
        // load root instance
        load();
    };
    
    // create and init core module instance
    instances.M = clone(Mono);
    instances.M.mono = {name: 'M'};
    instances.M._ready = true;
    
    // make "load" a ws event
    instances.M.on('inst>', send('inst>'));
    
    // export mono client 
    return win.M = load;
})({}, {}, {}, 'function', window, document);
