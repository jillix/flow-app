// clone object
Object.clone = function(object) {
    var Module = function() {};
    Module.prototype = object || {};
    return new Module();
};

// Object.paht('Object.key.key.value'[, {'key': {'key': {'value': 123}}});
Object.path = function (path, scope) {
    
    path = path.split('.');
    scope = scope || window;
    
    for (var i = 0; i < path.length; ++i) {
        
        // return if key not found
        if (!scope[path[i]]) {
            return null;
        }
        
        // update scope
        scope = scope[path[i]];
    }
    
    return scope;
};

// global module loader
var M = (function(miids) {
    
    // check and initialize websockets
    if (typeof WebSocket === 'undefined') {
        return alert('You have an old browser :(\n\nPlease update to the latest version\nand this site will work.');
    }
    
    var fn = 'function';
    var convertToArray = Array.prototype.slice;
    var head = document.getElementsByTagName('head')[0];
    var webSocket = new WebSocket('ws://' + window.location.host + '/');
    
    // module cache
    var modules = {};
    
    // ws callback cache
    var wsCache = {};
    
    // module class
    var Mono = {
        // remove the module instance from dom and cache
        die: function () {
            var miid = miids[this.miid];
            
            if (miid) {
                
                // remove module from dom
                if (miid.dom) {
                    miid.dom.parentNode.removeChild(miid.dom);
                }
                
                // remove module
                miid = 0;
            }
        },
        // listen to events
        on: listen,
        one: function (event, handler) {
            listen.call(this, event, handler, true);
        },
        // remove listeners
        off: function (event, handler) {
            var events = this.mono.events;
            
            if (events && events[event]) {
                
                if (handler) {
                    
                    for (var i = 0, l = events[event].length; i < l; ++i) {
                        
                        if (events[event][i][0] === handler) {
                            events[event].splice(i, 1);
                        }
                    }
                    
                } else {
                    delete events[event];
                }
            }
        },
        // emit event
        emit: function(event) {
            var events = this.mono.events;
            
            // mark miid as ready
            if (event === 'ready') {
                this.mono.ready = true;
            }

            if (events && events[event]) {
                
                // slice first argument and apply the others to the callback function
                var args = convertToArray.call(arguments).slice(1);
                
                for (var i = 0, l = events[event].length; i < l; ++i) {
                    
                    if (events[event][i]) {
                        
                        // Fire registred Methods
                        events[event][i].apply(this, args);
                        
                        // remove from event buffer, if once is true
                        if (events[event][i].one) {
                            events[event].splice(i, 1);
                        }
                    }
                }
            }
        },
        // emit an event on a miid
        push: function (miid, event) {
            if (miids[miid]) {
                
                // slice first argument and apply the others to the callback function
                var args = convertToArray.call(arguments).slice(1);
                
                miids[miid].emit.apply(miids[miid], args);
            }
        },
        // emit on all miids
        pushAll: function (event) {
            
            // slice first argument and apply the others to the callback function
            var args = convertToArray.call(arguments);
            
            for (var miid in miids) {
                miids[miid].emit.apply(miids[miid], args);
            }
        }
    };
    
    // create core module instance
    var core = Object.clone(Mono);
    core.mono = {miid: 'M', ready: true};
    
    // load miid
    core.load = function (miid, parentMiid) {
        
        // don't load the same miid more than once
        if (!miid || miids[miid]) {
            return;
        }
        
        // wait for websocket
        if (webSocket.readyState !== webSocket.OPEN) {
            return webSocket.onopen = function () {
                miids.M.load(miid, parentMiid);
            };
        }
        
        // get miid config
        miids.M.emit('load', null, miid, function (err, config) {
            
            if (err) {
                return;
            }
            
            // load dependend modules
            if (config.modules) {
                for (var i = 0, l = config.modules.length; i < l; ++i) {
                    M(config.modules[i], miid);
                }
            }
            
            // add parent miid to waitFor config
            if (parentMiid) {
                config.waitFor = config.waitFor || [];
                config.waitFor.push(parentMiid);
            }
            
            // create module instance
            miids[miid] = Object.clone(Mono);
            var miidMono = miids[miid].mono = {
                config: config,
                miid: miid,
                name: config.name
            };
            
            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                loadJS(miid, config.name, config.scripts, function (miid, moduleConstructor) {
                    
                    miidMono.init = miidMono.init || moduleConstructor;

                    // listen to send events
                    if (config.events) {
                        for (var i = 0, l = config.events.length; i < l; ++i) {
                            miids[miid].on(config.events[i], send(config.events[i]));
                        }
                    }

                    initModule(miid);
                });
                
            } else {
                initModule(miid);
            }
        });
    };
    
    // wrapping function
    core.load.wrap = function (name, module) {
        modules[name] = module;
        miids.M.emit(name);
    };
    
    // listen to core load event
    core.on('load', send('load'));
    
    // miid cache
    miids.M = core;
    
    // parse websocket messages: ["miid:event:cbId","err","data"]
    webSocket.onmessage = function (message) {
        
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }
        
        message[0] = message[0].split(':');
        
        var miid = message[0][0];
        var event = message[0][1];
        var cbId = message[0][2];
        var err = message[1];
        var data = message[2];
        
        if (miid && event && miids[miid]) {
            
            // call callback
            if (wsCache[cbId]) {
                wsCache[cbId].call(miids[miid], err, data);
                delete wsCache[cbId];
            }
            
            // emit event
            miids[miid].emit(event, err, data);
        }
    };
    
    // create websocket message: ["miid:event:cbId","err","data"]
    function send (event) {
        return function (err, data, callback) {
            
            var message = [this.mono.miid + ':' + event, 0];
            
            if (err) {
                message[1] = err;
            }
            
            if (data) {
                message[2] = data;
            }
            
            if (callback) {
                var cbId = uid(5);
                wsCache[cbId] = callback;
                message[0] += ':' + cbId;
            }
            
            try {
                message = JSON.stringify(message);
            } catch (err) {
                if (callback) {
                    return callback(err);
                }
            }
            
            webSocket.send(message);
        };
    }
    
    // random string generator
    function uid (len) {
        for (var i = 0, l = len || 23, random = ''; i < l; ++i) {
            random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
        }
        return random;
    }
    
    // add listeneres
    function listen (event, handler, once) {
        var events = this.mono.events = this.mono.events || {};
        
        if (typeof handler === fn) {
            // fire ready event immediately if miid is ready
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
    
    // load scripts
    function initModule (miid) {
        
        miid = miids[miid].mono;
        
        // call module init
        if (typeof miid.init === fn) {
            
            // handle waitFor
            if (miid.config.waitFor instanceof Array) {
                var count = miid.config.waitFor.length;
                var current = 0;
                var handler = function () {
                    if (current === count) {
                        miid.init.call(miids[miid.miid]);
                    }
                };
                
                for (;current < count; ++current) {
                    miids[miid.miid].one('ready', miid.config.waitFor[current], handler);
                }
            } else {
                miid.init.call(miids[miid.miid]);
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
    function createCommonJsModulesInOrder (miid, moduleSources, callback) {
        
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
        callback(miid, modules[moduleSources[0]] ? modules[moduleSources[0]].exports : null);
    }
    
    // load scripts (script tag)
    function loadJS (miid, moduleName, moduleSources, callback) {

        var length = moduleSources.length;

        var extDepLoaded = function (src) {
            return function () {
                modules[src] = 3;
                miids.M.emit(src);
            };
        };
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(miid, moduleSources, callback);
            }
        };
        
        for (var i = moduleSources.length - 1, source, url; i >= 0; --i) {
            
            // ingore loading for unified code 
            if (moduleSources[0] === '#') {
                // remove the control sign
                moduleSources[i] = moduleSources[i].indexOf('./') === 1 ? moduleSources[i].substr(3) : moduleSources[i].substr(1);
                --length;
                continue;
            }
            
            // load external scripts
            if (moduleSources[i][0] === '/' || moduleSources[i].indexOf('://') > 0) {
                modules[moduleSources[i]] = 1;
                node.onload = extDepLoaded(moduleSources[i]);
                url = source = moduleSources[i];
            } else {
                url = '/@/M/';
                
                // load module file
                if (moduleSources[i].indexOf('./') === 0) {
                    moduleSources[i] = moduleSources[i].substr(2);
                    url = url + 'mod/' + miid + '/' + moduleSources[i];
                    source = moduleName + moduleSources[i];
                // load dependency
                } else {
                    source = moduleSources[i];
                    url = url + 'dep/' + miid + '/' + source;
                }
                
                modules[source] = 2;
                moduleSources[i] = source;
            }
            
            // when script is loaded check if it's evaluated
            miids.M.one(source, modDepLoaded);
            
            // emit source event for already loaded scripts
            if (typeof modules[source] === fn || modules[source] === 3) {
                miids.M.emit(source);
            
            // load module scripts
            } else {
                var node = document.createElement('script');
                node.src = url;
                head.appendChild(node);
            }
        }
    }
    
    return core.load;
})({});
