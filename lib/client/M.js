// global module loader
var M = (function(instances, modules, wsCache, fn, win) {
    
    // check and initialize websockets
    if (!win.WebSocket || !win.history) {
        return alert('You have an old browser :(\n\nPlease update to the latest version\nand this site will work.');
    }
    
    var webSocket = new WebSocket('ws://' + win.location.host + '/');
    var head = document.getElementsByTagName('head')[0];
    
    // module class
    var Mono = {
        // remove the module instance cache
        die: function () {
            delete instances[this.name];
        },
        // listen to events
        on: listen,
        one: function (event, handler) {
            listen.call(this, event, handler, true);
        },
        // remove listeners
        off: function (event, handler) {
            var events = this.mono.events;
            
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
            var events = this.mono.events;
            
            // mark instance as ready
            if (event === 'ready') {
                this.mono.ready = true;
            }
            
            if (events[event]) {
                
                // slice first argument
                var args = convertToArray(arguments).slice(1);
                var rm = [];
                
                for (var i = 0; i < events[event].length; ++i) {
                    if (events[event][i]) {
                        
                        // call registered Methods
                        events[event][i].apply(this, args);
                        
                        // remove from event buffer, if once is true
                        if (events[event][i].one) {
                            events[event][i] = null;
                            rm.push([event, i]);
                        }
                    }
                }
                
                remove(events, rm);
            }
        },
        // emit an event on a instance
        push: function (instance, event) {
            if (instances[instance]) {
                instances[instance].emit.apply(instances[instance], convertToArray(arguments).slice(1));
            }
        },
        // emit on all instances
        pushAll: function (event) {
            var args = convertToArray(arguments);
            for (var instance in instances) {
                instances[instance].emit.apply(instances[instance], args);
            }
        }
    };
    
    function convertToArray (object) {
        return Array.prototype.slice.call(object);
    }
    
    // clone object
    function clone (object) {
        var O = (function() {});
        O.prototype = object || {};
        return new O();
    }
    
    // load instance
    function load (instance, parentInstance) {
        
        // don't load the same instance more than once
        if (!instance || instances[instance]) {
            return;
        }
        
        // wait for websocket
        if (webSocket.readyState !== webSocket.OPEN) {
            return webSocket.onopen = function () {
                load(instance, parentInstance);
            };
        }
        
        // get instance config
        instances.M.emit('load', null, instance, function (err, config) {
            
            if (err) {
                return;
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
            instances[instance] = clone(Mono);
            instances[instance].mono = {
                config: config,
                name: instance,
                module: config.module,
                events: {}
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
                    
                    initModule(instances[instance], moduleConstructor);
                });
                
            } else {
                initModule(instances[instance]);
            }
        });
    }
    
    // add listeneres
    function listen (event, handler, once) {
        var events = this.mono.events;
        
        if (typeof handler === fn) {
            // fire ready event immediately if instance is ready
            if (event === 'ready' && this.mono.ready) {
                return handler.call(this);
            }
            
            if (!events[event]) {
                events[event] = [];
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
    
    // load scripts
    function initModule (instance, init, waitFor) {
        
        // call module init
        if (typeof init === fn) {
            
            waitFor = instance.mono.config.waitFor;
            
            // handle waitFor
            if (waitFor instanceof Array) {
                
                var count = waitFor.length;
                var current = 0;
                var handler = function () {
                    if (++current === count) {
                        init.call(instance);
                    }
                };
                
                for (var i = 0; i < count; ++i) {
                    instances[waitFor[i]].one('ready', handler);
                }
            } else {
                init.call(instance);
            }
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
    
    // random string generator
    function uid (len) {
        len = len || 23;
        for (var i = 0, random = ''; i < len; ++i) {
            random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
        }
        return random;
    }

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
                var node = document.createElement('script');
                
                url = '/@/M/mod/' + source;
                
                // handle external scripts onload event
                if (source[0] === '/' || source.indexOf('://') > 0) {
                    node.onload = extDepLoaded(source);
                    url = source;
                }
                
                node.src = url;
                head.appendChild(node);
            }
        }
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
            }
            
            try {
                message = JSON.stringify(message);
            } catch (parseError) {
                if (callback) {
                    callback(parseError);
                }
                return;
            }
            
            if (callback) {
                wsCache[cbId] = callback;
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
        
        message[0] = message[0].split(':');
        
        var instance = message[0][0];
        var event = message[0][1];
        var cbId = message[0][2];
        var err = message[1];
        var data = message[2];

        if (err) {
            console.error('[Instance: ' + instance + '; Event: ' + event + ']: ' + err);
        }
        
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
    
    // create and init core module instance
    instances.M = clone(Mono);
    instances.M.mono = {name: 'M', ready: true, events: {}};
    instances.M.on('load', send('load'));
    
    // wrapping function
    load.wrap = function (name, module) {
        modules[name] = module;
        instances.M.emit(name);
    };
    
    // export some handy functions
    load.clone = clone;
    
    // Object.paht('Object.key.key.value'[, {'key': {'key': {'value': 123}}});
    load.path = function (path, scope) {
        
        path = path.split('.');
        scope = scope || win;
        
        // find keys in paths or return null
        for (var i = 0; i < path.length; ++i) {
            if (!(scope = scope[path[i]])) {
                return;
            }
        }
        
        return scope;
    };
    
    return load;
})({}, {}, {}, 'function', window);
