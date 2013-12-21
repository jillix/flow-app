// Copyright Adrian Ottiker (adrian@ottiker.com). All Rights Reserved.

// TODO send error to server
//window.onerror = function(error, url, line) {};

// exent object (object inherits from inherit)
Object.extend = function(object, inherit) {
    
    var Module = function(properties) {
        if (typeof properties === 'object') {
            for (var property in properties) {
                if (properties.hasOwnProperty(property)) {
                    this[property] = properties[property];
                }
            }
        }
    };
    
    Module.prototype = inherit || {};
    object = new Module(object);
    
    return object;
};

var M = (function() {
    
    var fn = 'function';
    
    ////////////////////////////////////////////////////////////////////////////
    // WEBSOCKETS
    ////////////////////////////////////////////////////////////////////////////
    
    // check and initialize websockets
    if (typeof WebSocket === 'undefined') {
        return alert('Update your f***ing browser!');
    }
    
    // open a websocket
    // TODO try to reconnect if a connection is closed (try to solve it with events instead of an interval)
    var webSocket = new WebSocket('ws://' + window.location.host + '/');
    
    // handle websocket messages events
    webSocket.onmessage = function (message) {
        
        // parse message ["miid:event:msgid","err","data"]
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }
        
        message[0] = message[0].split(':');
        
        // parse message
        var miid = message[0][0];
        var event = message[0][1];
        var msgId = message[0][2];
        var err = message[1];
        var data = message[2];
        
        if (miid && event) {
            
            // handle callback
            if (msgId && miids[miid].mono.ws && miids[miid].mono.ws[msgId]) {
                miids[miid].mono.ws[msgId].call(miids[miid] || Mono, err, data);
                delete miids[miid].mono.ws[msgId];
            }
            
            // emit event
            if (miids[miid]) {
                miids[miid].emit(event, err, data);
            }
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
            
            // ["miid:event:msgid","err","data"]
            
            var message = [this.mono.miid + ':' + event, 0];
            
            if (err) {
                message[1] = err;
            }
            
            if (data) {
                message[2] = data;
            }
            
            if (callback) {
                var msgId = uid(5);
                this.mono.ws[msgId] = callback;
                message[0] += ':' + msgId;
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
    
    ////////////////////////////////////////////////////////////////////////////
    // MONO MODULE
    ////////////////////////////////////////////////////////////////////////////
    
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
            console.log('emit: ' + event);
            var events = this.mono.events;
            
            // mark miid as ready
            if (event === 'ready') {
                this.mono.ready = true;
            }

            // slice first argument and apply the others to the callback function
            var args = Array.prototype.slice.call(arguments).slice(1);
            console.log(events);
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
        },
        
        // TODO emit to all miids
        //all: function (event) {},
        
        // TODO trigger and event on a miid
        //push: function (event, miid) {}
    };
    
    // miid cache
    var miids = {
        M: Object.extend({
            mono: {
                events: {},
                miid: 'M',
                ws: {},
                ready: true
            }
        }, Mono)
    };
    
    // listen to core load event
    miids.M.on('load', send('load'));
    
    ////////////////////////////////////////////////////////////////////////////
    /// CORE MODULE
    ////////////////////////////////////////////////////////////////////////////
    
    // module cache
    var modules = {};
    
    // get head reference
    var head = document.getElementsByTagName('head')[0];
    
    // css cache
    var css = {};
    
    // load scripts
    function initModule (miid) {
        
        miid = miids[miid].mono;
        
        // append module to the dom
        // TODO make target optional
        if (miid.target && miid.dom) {
            miid.target.appendChild(miid.dom);
        }
        
        // call module init
        if (typeof miid.init === fn) {
            
            // handle waitFor
            if (miid.config.waitFor instanceof Array) {
                var loaded = 0;
                
                for (var i = 0, l = miid.config.waitFor.length; i < l; ++i) {
                    miids[miid.miid].one('ready', miid.config.waitFor[i], function () {
                        if (++loaded === l) {
                            miid.init.call(miids[miid.miid], miid.config);
                        }
                    }, true);
                }
            } else {
                miid.init.call(miids[miid.miid], miid.config.data || {});
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
    
    // TODO custom functions? should be handled by the module?
    var load = function (target, miid) {
        
        // wait for websocket
        if (webSocket.readyState !== webSocket.OPEN) {
            webSocket.onopen = function () {
                load.call(this, target, miid);
            };
            return;
        }
        
        // get dom target
        target = typeof target === 'string' ? document.querySelector(target) : target;
        
        // don't load the same miid more than once
        if (!miid || !target || miids[miid]) {
            return;
        }
        
        miids.M.one('config', function (err, config) {
            
            if (err) {
                return;
            }
            
            // load dependend modules
            // TODO don't forget the html loading times!!!
            if (config.modules) {
                for (var selector in config.modules) {
                    M(selector, config.modules[selector]);
                }
            }
            
            // create module instance
            miids[miid] = {
                mono: {
                    config: config,
                    state: 0,
                    events: {},
                    target: target,
                    miid: miid,
                    name: config.name,
                    ws: {}
                }
            };
            var miidMono = miids[miid].mono;
            
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
                
                // TODO load html snippets over ws
                miids.M.emit('getHtml', null, config.html, function (err, html) {
                    
                    // create module container
                    var container = document.createElement('div');
                    container.setAttribute('id', miid);
                    container.innerHTML = html || '';
                    
                    // append the dom container to the module
                    miids[miid].mono.dom = container;
                    
                    if (++miidMono.state === 2) {
                        initModule(miid);
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
                        miids[miid] = Object.extend(miids[miid], Mono);
                        
                        // listen to send events
                        if (config.events) {
                            for (var i = 0, l = config.events.length; i < l; ++i) {
                                miids[miid].on(config.events[i], send(config.events[i]));
                            }
                        }
                        
                        if (++miidMono.state === 2) {
                            initModule(miid);
                        }
                    }
                });
                
            } else if (++miidMono.state === 2) {
                initModule(miid);
            }
        });
        
        // get miid config
        miids.M.emit('load', null, miid);
    };
    
    // wrapping script
    load.wrap = function (name, module) {
        modules[name] = module;
        miids.M.emit(name);
    };
    
    return load;
})();
