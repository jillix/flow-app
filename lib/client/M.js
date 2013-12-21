// Copyright Adrian Ottiker (adrian@ottiker.com). All Rights Reserved.

// TODO send error to server
//window.onerror = function(error, url, line) {};

// clone object
Object.clone = function(object) {
    var Module = function() {};
    Module.prototype = object || {};
    return new Module();
};

var M = (function(miids) {
    
    var fn = 'function';
    
    // check and initialize websockets
    if (typeof WebSocket === 'undefined') {
        return alert('Update your f***ing browser!');
    }
    
    // open a websocket
    // TODO try to reconnect if a connection is closed (try to solve it with events instead of an interval)
    var webSocket = new WebSocket('ws://' + window.location.host + '/');
    
    // handle websocket messages events
    webSocket.onmessage = function (message) {
        
        // parse message ["miid:event:cbId","err","data"]
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }
        
        message[0] = message[0].split(':');
        
        // parse message
        var miid = message[0][0];
        var event = message[0][1];
        var cbId = message[0][2];
        var err = message[1];
        var data = message[2];
        
        if (miid && event && miids[miid]) {
            
            // call callback
            if (miids[miid].mono.ws[cbId]) {
                miids[miid].mono.ws[cbId].call(miids[miid] || Mono, err, data);
                delete miids[miid].mono.ws[cbId];
            }
            
            // emit event
            miids[miid].emit(event, err, data);
        }
    };
    
    // random string generator
    function uid (len) {
        for (var i = 0, l = len || 23, random = ''; i < l; ++i) {
            random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
        }
        return random;
    }
    
    // send event handler
    function send (event) {
        return function (err, data, callback) {
            
            // ["miid:event:cbId","err","data"]
            
            var message = [this.mono.miid + ':' + event, 0];
            
            if (err) {
                message[1] = err;
            }
            
            if (data) {
                message[2] = data;
            }
            
            if (callback) {
                var cbId = uid(5);
                this.mono.ws[cbId] = callback;
                message[0] += ':' + cbId;
            }
            
            try {
                message = JSON.stringify(message);
            } catch (err) {
                if (callback) {
                    callback(err);
                }
            }
            
            webSocket.send(message);
        };
    }
    
    function listen (event, handler, once) {
        var events = this.mono.events;
        
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
        
        return this;
    }
    
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
            
            return this;
        },
        // emit event
        emit: function(event) {
            var events = this.mono.events;
            
            // mark miid as ready
            if (event === 'ready') {
                this.mono.ready = true;
            }

            // slice first argument and apply the others to the callback function
            var args = Array.prototype.slice.call(arguments).slice(1);
            
            if (events && events[event]) {
                
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
            
            return this;
        }
        
        // TODO emit to all miids
        //all: function (event) {},
        
        // TODO trigger and event on a miid
        //push: function (event, miid) {}
    };
    
    // module cache
    var modules = {};
    
    // get head reference
    var head = document.getElementsByTagName('head')[0];
    
    // css cache
    var css = {};
    
    // load scripts
    function initModule (miid, target) {
        
        miid = miids[miid].mono;
        
        // append module to the dom
        if (miid.dom && target) {
            target = typeof target === 'string' ? document.querySelector(target) : target;
            
            if (target) {
                target.appendChild(miid.dom);
            }
        }
        
        // call module init
        if (typeof miid.init === fn) {
            
            // handle waitFor
            if (miid.config.waitFor instanceof Array) {
                var count = miid.config.waitFor.length;
                var current = 0;
                var handler = function () {
                    if (current === count) {
                        miid.init.call(miids[miid.miid], miid.config.data);
                    }
                };
                
                for (;current < count; ++current) {
                    miids[miid.miid].one('ready', miid.config.waitFor[current], handler);
                }
            } else {
                miid.init.call(miids[miid.miid], miid.config.data);
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
        
        for (var i = moduleSources.length - 1, source; i >= 0; --i) {
            
            source = moduleName + moduleSources[i];
            
            // ingore loading for unified code 
            if (source[0] === '#') {
                // remove the control sign
                moduleSources[i] = source.substr(1);
                --length;
                continue;
            }
            
            // when script is loaded check if it's evaluated
            miids.M.one(source, modDepLoaded);
            
            // emit source event for already loaded scripts
            if (typeof modules[source] === fn || modules[source] === 3) {
                miids.M.emit(source);
            
            // load module scripts
            } else {
                var node = document.createElement('script');
                
                if (moduleSources[i][0] === '/' || moduleSources[i].indexOf('://') > 0) {
                    // set script status to: external script
                    modules[moduleSources[i]] = 1;
                    node.src = moduleSources[i];
                    node.onload = extDepLoaded(moduleSources[i]);
                } else {
                    // set script status to: module script not loaded
                    modules[source] = 2;
                    node.src = '/@/M/module/' + miid + '/' + moduleSources[i];
                    moduleSources[i] = source;
                }
                
                head.appendChild(node);
            }
        }
    }
    
    // build core module
    var core = Object.clone(Mono);
    core.mono = {
        events: {},
        miid: 'M',
        ws: {},
        ready: true
    };
    // load miid
    core.load = function (miid, target, parentMiid) {
        
        // don't load the same miid more than once
        if (!miid || miids[miid]) {
            return;
        }
        
        // wait for websocket
        if (webSocket.readyState !== webSocket.OPEN) {
            webSocket.onopen = function () {
                miids.M.load(miid, target, parentMiid);
            };
            return;
        }
        
        // get miid config
        miids.M.emit('load', null, miid, function (err, config) {
            
            if (err) {
                return;
            }
            
            // load dependend modules
            if (config.modules) {
                for (var selector in config.modules) {
                    M(config.modules[selector], selector, miid);
                }
            }
            
            // add parent miid to waitFor config
            if (parentMiid) {
                config.waitFor = config.waitFor || [];
                config.waitFor.push(parentMiid);
            }
            
            // create module instance
            var miidMono = {
                config: config,
                state: 0,
                events: {},
                miid: miid,
                name: config.name,
                ws: {}
            };
            miids[miid] = Object.clone(Mono);
            miids[miid].mono = miidMono;
            
            // load css
            if (config.css) {
                for (var i in config.css) {
                    if (!css[config.css[i]]) {
                        
                        css[config.css[i]] = 1;
                        
                        var link = document.createElement('link');
                        link.setAttribute('rel', 'stylesheet');
                        link.setAttribute('href', config.css[i]);
                        
                        head.appendChild(link);
                    }
                }
            }
            
            // load html
            if (config.html) {
                this.emit('getHtml', null, config.html, function (err, html) {
                    
                    // create module container
                    var container = document.createElement('div');
                    container.setAttribute('id', miid);
                    container.innerHTML = html || '';
                    
                    // append the dom container to the module
                    miids[miid].mono.dom = container;
                    
                    if (++miidMono.state === 2) {
                        initModule(miid, target);
                    }
                });
                
            } else {
                ++miidMono.state;
            }
            
            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                loadJS(miid, config.name, config.scripts, function (miid, moduleConstructor) {
                    
                    // create module
                    if (miidMono.config.name) {
                        miidMono.init = miidMono.init || moduleConstructor;
                        
                        // listen to send events
                        if (config.events) {
                            for (var i = 0, l = config.events.length; i < l; ++i) {
                                miids[miid].on(config.events[i], send(config.events[i]));
                            }
                        }
                        
                        if (++miidMono.state === 2) {
                            initModule(miid, target);
                        }
                    }
                });
                
            } else if (++miidMono.state === 2) {
                initModule(miid, target);
            }
        });
    };
    // wrapping script
    core.load.wrap = function (name, module) {
        modules[name] = module;
        miids.M.emit(name);
    };
    
    // listen to core load event
    core.on('load', send('load'));
    core.on('getHtml', send('getHtml'));
    
    // miid cache
    miids.M = core;
    
    return core.load;
})({});
