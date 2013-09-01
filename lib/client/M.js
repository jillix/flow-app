// Copyright Adrian Ottiker (adrian@ottiker.com). All Rights Reserved.

// TODO not working in new browsers with the XHR onload IE8 fix
//'use strict';

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
    
    // module cache
    var modules = {};
    var moduleLoadCache = {};
    
    // require module cache
    var moduleDeps = {};
    
    // raw script cache
    var moduleScripts = {};
    
    // evaluated script cache
    var moduleEval = {};
    
    // css cache
    var css = {};
   
    // event cache
    var events = {};
    
    // get head reference
    var head = document.getElementsByTagName('head')[0];
    
    var fn = 'function';
    
    function listen (event, miid, handler, once) {
        
        if (typeof miid === fn) {
            handler = miid;
            miid = this.miid || '_';
        }
        
        if (typeof handler === fn) {
            
            // fire ready event immediately if miid is ready
            if (event === 'ready' && modules[miid] && modules[miid].ready) {
                return handler.call(this);
            }

            if (!events[miid]) {
                events[miid] = {};
            }
            
            if (!events[miid][event]) {
                events[miid][event] = [];
            }
            
            events[miid][event].push([handler, once]);
        }
        
        return this;
    }
    
    // remove events
    function removeEvents (miid, event, handlers) {
        
        for (var i = 0, l = handlers.length; i < l; ++i) {
            if (!handlers[i]) {
                events[miid][event].splice(i, 1);
            }
        }
    }
    
    // Set up load listener
    function onload (elm, handler) {
        
        if (typeof elm.onload !== 'undefined') {
            elm.onload = handler;
        } else {
            elm.onreadystatechange = function () {
                if (elm.readyState === 'loaded' || elm.readyState === 'complete' || elm.readyState === 4) {
                    elm.onreadystatechange = null;
                    handler();
                }
            };
        }
    }
    
    // module class
    var Mono = {
        
        uninit: function (miid) {
            miid = miid || this.miid;
            
            if (modules[miid]) {
                
                // remove module from dom
                if (modules[miid].dom) {
                    modules[miid].dom.parentNode.removeChild(modules[miid].dom);
                }
                
                // delete events
                delete events[miid];
                
                // delete module
                delete modules[miid];
            }
        },
        // listen to events
        /*
            this.on('setSomething', 'miid', function () {});
            this.on('setSomething', function () {});
        */
        on: listen,
        once: function (event, miid, handler) {
            listen.call(this, event, miid, handler, true);
        },
        
        // remove listeners
        /*
            this.off('setSomething', 'miid', function () {});
            this.off('setSomething', function () {});
        */
        off: function(event, miid, handler) {
            
            if (arguments.length < 3) {
                handler = arguments[1];
                miid = this.miid;
            }
            
            if (events[miid] && events[miid][event]) {
                
                if (handler) {
                    
                    for (var i = 0, l = events[miid][event].length; i < l; ++i) {
                        
                        if (events[miid][event][i][0] === handler) {
                            events[miid][event][i] = 0;
                        }
                    }
                    
                    // remove events
                    removeEvents(miid, event, events[miid][event]);
                    
                } else {
                    delete events[miid][event];
                }
            }
            
            return this;
        },
        
        // emit event
        /*
            this.emit('myEvent', arg1, arg2, ...);
        */
        emit: function(event) {
            
            if (event === 'ready' && modules[this.miid]) {
                modules[this.miid].ready = true;
            }

            // slice first argument and apply the others to the callback function
            var args = Array.prototype.slice.call(arguments).slice(1);
            var miid = this.miid || '_';
            
            if (events[miid] && events[miid][event]) {
                
                for (var i = 0, l = events[miid][event].length; i < l; ++i) {
                    
                    if (events[miid][event][i]) {
                        
                        // Fire registred Methods
                        events[miid][event][i][0].apply(this, args);
                        
                        // remove from event buffer, if once is set
                        if (events[miid][event][i][1]) {
                            events[miid][event][i] = 0;
                        }
                    }
                }
                
                // remove events
                removeEvents(miid, event, events[miid][event]);
            }
            
            return this;
        },
        
        // make requests to backend
        /*
            this.link('operationName', function() {});
            this.link('operationName', OPTIONS, function () {});
            
            OPTIONS: {
                
                miid: 'miid',
                path: 'path/to/some/thing',
                data: {POST DATA},
                upload: function () {},
                download: function () {}
            }
        */
        link: function(method, options, callback) {
            
            if (typeof method !== 'string') {
                return;
            }
            
            if (typeof options === fn) {
                callback = options;
                options = {};
            }
            
            options = options || {};
            
            // create new link
            var link = new XMLHttpRequest();
            var url;
            
            if (method[0] === '/') {
                url = method;
            } else {
                url = '/@/' + (options.miid || this.miid) + '/' + method + '/' + (options.path || '') + (options.query || '');
            }
            
            // open the connection
            link.open(options.data ? 'post' : 'get', url, !options.sync);
            
            // handle data
            if (options.data && !(typeof FormData !== 'undefined' && options.data instanceof FormData)) {
        
                try {
                    // set content-type header to application/json
                    link.setRequestHeader('content-type', 'application/json');
        
                    // stringify object to JSON
                    options.data = JSON.stringify(options.data);
        
                } catch(err) {
        
                    // abort request
                    link.abort();
        
                    // fire callback with error
                    if (callback) {
                        callback(err);
                    }
        
                    // exit function
                    return;
                }
            }
        
            // attach callback to upload progress event
            if (link.upload && options.upload) {
                link.upload.onprogress = options.upload;
            }
        
            // attach callback to download progress event
            if (options.downlaod) {
                link.onprogress = options.download;
            }
            
            // request complete callback
            onload(link, function () {
                
                // get error message
                var err = link.A ? 'A' : link.status < 400 ? null : link.responseText;
    
                // reset abort status
                link.A = 0;
    
                if (callback) {
    
                    var response = null;
    
                    // parse result as JSON
                    if ((link.getResponseHeader('content-type') || '').indexOf('application/json') > -1) {

                        try {
                            response = JSON.parse(link.responseText);
                        }
                        catch (error) {
                            err = error;
                        }
                    }
                    else {
                        response = link.responseText;
                    }
                    
                    // fire callback
                    callback(err, response, link);
                }
            });
            
            // send data
            link.send(options.data);

            return function() {
                link.A = 1;
                link.abort();
            };
        }
    };
    
    function initModule (target, miid, config, dataContext) {
        
        // append module to the dom
        if (modules[miid].dom) {
            target.appendChild(modules[miid].dom);
        }
        
        // load dependend modules
        if (config.modules) {
            for (var selector in config.modules) {
                M(selector, config.modules[selector], dataContext);
            }
            
            // TODO remove when bind-layout doesn't load modules anymore
            delete config.modules;
        }
        
        if (typeof moduleLoadCache[miid].init === fn) {
            if (config.waitFor instanceof Array) {
                var loaded = 0;
                
                for (var i = 0, l = config.waitFor.length; i < l; ++i) {
                    modules[miid].on('ready', config.waitFor[i], function () {
                        if (++loaded === l) {
                            moduleLoadCache[miid].init.call(modules[miid], config, dataContext);
                        }
                    }, true);
                }
            } else {
                moduleLoadCache[miid].init.call(modules[miid], config, dataContext);
            }
        }
    }
    
    function require (miid, module) {
        
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
                
                for (var script in moduleDeps[miid]) {
                    if (script.indexOf(name) === 0) {
                        name = script;
                        break;
                    }
                }
            }
            
            name += name.slice(-3) !== '.js' ? '.js' : '';
            
            if (moduleDeps[miid][name]) {
                return moduleDeps[miid][name].exports;
            }
        };
    };
    
    function evaluateScriptsInOrder (miid, moduleSources, callback) {
        
        // eveluate scripts in order (desc)
        for (var i = (moduleSources.length - 1), l = 0; i >= l; --i) {
            
            if (typeof moduleScripts[moduleSources[i]] === fn) {
                
                // evaluate module script
                if (!moduleEval[moduleSources[i]]) {
                    
                    var module = moduleDeps[miid][moduleSources[i]] = {
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
                    moduleEval[moduleSources[i]] = moduleScripts[moduleSources[i]].call(module.exports, require(miid, module), module, module.exports);
                }
                
                // save evaluated module, with miid, scoped
                moduleDeps[miid][moduleSources[i]] = moduleEval[moduleSources[i]];
            }
        }
        
        callback(miid, moduleDeps[miid][moduleSources[0]] ? moduleDeps[miid][moduleSources[0]].exports : null);
    }
    
    function checkIfScriptIsEvaluated (miid, moduleScripts, moduleSources, callback) {
        
        for (var i = 0, l = moduleSources.length; i < l; ++i) {

            if (moduleScripts[moduleSources[i]] === 2) {
                // TODO pass the current i value and continue from there instead starting from 0 when trying again
                return setTimeout( function () { checkIfScriptIsEvaluated(miid, moduleScripts, moduleSources, callback); }, 30);
            }
        }
        
        evaluateScriptsInOrder(miid, moduleSources, callback);
    }
    
    function loadJS (miid, moduleSources, callback) {

        var length = moduleSources.length;

        var modLoaded = function (src) {
            return function () {
                moduleScripts[src] = moduleScripts[src] === 1 ? 3 : moduleScripts[src];
                Mono.emit(src, moduleScripts, callback, --length);
            };
        };
        
        moduleDeps[miid] = moduleDeps[miid] || {}
        
        for (var i = moduleSources.length - 1, dontLoad; i >= 0; --i) {
            
            // ingore loading for unfied code 
            if (moduleSources[i][0] === '#') {
                // remove the control sign
                moduleSources[i] = moduleSources[i].substr(1);
                dontLoad = true;
            } else {
                dontLoad = false;
            }
            
            Mono.once(moduleSources[i], (function (miid, moduleSources) {
                
                return function (moduleScripts, callback, length) {
                    if (length === 0) {
                        checkIfScriptIsEvaluated(miid, moduleScripts, moduleSources, callback);
                    }
                }
            
            })(miid, moduleSources));
            
            if (!dontLoad && !moduleScripts[moduleSources[i]]) {
                
                var node = document.createElement('script');
                
                if (moduleSources[i][0] === '/' || moduleSources[i].indexOf('://') > 0) {
                    // set script status to: external script
                    moduleScripts[moduleSources[i]] = 1;
                    node.src = moduleSources[i];
                } else {
                    // set script status to: module script not loaded
                    moduleScripts[moduleSources[i]] = 2;
                    node.src = '/@/core/getModule/' + moduleSources[i];
                }
                
                onload(node, modLoaded(moduleSources[i]));
                
                head.appendChild(node);
            
            } else {
                
                --length;
                
                if (typeof moduleScripts[moduleSources[i]] === fn || moduleScripts[moduleSources[i]] === 3) {
                    Mono.emit(moduleSources[i], moduleScripts, callback, length);
                }
            }
        }
    }
    
    // load mono modules
    var constructor = function (target, miid, dataContext, callback) {
        
        if (typeof dataContext === 'function') {
            callback = dataContext;
            dataContext = undefined;
        }
        
        target = typeof target === 'string' ? document.querySelector(target) : target;

        if (typeof callback !== fn) {
            callback = function() {};
        }

        if (!miid || !target) {
            return callback('Empty miid or module target');
        }
        
        // don't load the same miid more than once
        if (modules[miid]) {
            return callback(null, modules[miid]);
        }

        Mono.link('getConfig', {miid: 'core', path: miid}, function (err, config) {
            
            if (typeof config !== 'object') {
                callback(new Error('Invalid module config.'));
            }
            
            modules[miid] = modules[miid] || {};
            
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
            
            moduleLoadCache[miid] = {
                state: 0,
                config: config,
                target: target
            };
            
            // load html
            if (config.html) {

                Mono.link(config.html, function (err, html) {
                    
                    // create module container
                    var container = document.createElement('div');
                    container.setAttribute('id', miid);
                    container.innerHTML = html || '';
                    
                    // append the dom container to the module
                    modules[miid].dom = container;
                    
                    if (++moduleLoadCache[miid].state === 2) {
                        initModule(moduleLoadCache[miid].target, miid, moduleLoadCache[miid].config, dataContext);
                    }
                });
                
            } else {
                ++moduleLoadCache[miid].state;
            }
            
            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                
                loadJS(miid, config.scripts, function (miid, moduleConstructor) {
                    
                    // create module
                    if (moduleLoadCache[miid].config.path) {

                        moduleLoadCache[miid].init = moduleLoadCache[miid].init || moduleConstructor;

                        modules[miid].miid = miid;
                        modules[miid].path = moduleLoadCache[miid].config.path;
                        modules[miid] = Object.extend(modules[miid], Mono);
                        
                        if (++moduleLoadCache[miid].state === 2) {
                            initModule(moduleLoadCache[miid].target, miid, moduleLoadCache[miid].config, dataContext);
                        }
                    }
                    
                    callback(null, modules[miid]);
                });
                
            } else if (++moduleLoadCache[miid].state === 2) {
                initModule(target, miid, config);
            }
        });
    };

    constructor.clone = function (target, miid, name, config, callback) {
        
        var cloneMiid = miid + name;

        // get target
        target = typeof target === 'string' ? document.querySelector(target) : target;

        // check target, miid and if cloned miid already exists
        if (!target || !modules[miid] || modules[cloneMiid] || !moduleLoadCache[miid]) {
            return;
        }
        
        // make sure callback is a function
        callback = typeof callback === 'function' ? callback :  function () {};

        // create module instance
        modules[cloneMiid] = Object.extend({
            miid: cloneMiid,
            path: modules[miid].path
        }, Mono);

        // add module in loaded state to the load cache
        moduleLoadCache[cloneMiid] = {
            config: config,
            init: moduleLoadCache[miid].init,
            state: 1,
            target: target
        };

        // load html
        if (config.html) {
            
            Mono.link(config.html, function (err, html) {

                // create module container
                var container = document.createElement('div');
                container.setAttribute('id', cloneMiid);
                container.innerHTML = html || '';

                // append the dom container to the module
                modules[cloneMiid].dom = container;

                // set module as loaded
                ++moduleLoadCache[cloneMiid].state;
                
                // fire callback
                callback(modules[cloneMiid]);
                
                // init module
                initModule(target, cloneMiid, config);
            });

        } else {
            
            // set module as loaded
            ++moduleLoadCache[cloneMiid].state;
            
            // fire callback
            callback(modules[cloneMiid]);
            
            // init module
            initModule(target, cloneMiid, config); 
        }
    };
    
    constructor.getLocale = function () {
        
        var cookie = document.cookie.split(' ');
        
        for (var i = 0, l = cookie.length, tmp; i < l; ++i) {
            
            tmp = cookie[i].replace(';', '').split('=');
            
            if (tmp[0] === '_l') {
                return tmp[1];
            }
        }
        
        return '*';
    };
    
    constructor.wrap = function (name, module) {
        moduleScripts[name] = module;
    };

    return constructor;
})();
