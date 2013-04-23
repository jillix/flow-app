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
    var eventBuffer = {};
    
    // get head reference
    var head = document.getElementsByTagName('head')[0];
    
    // module class
    var Mono = {

        // listen to events
        /*
            this.on('setSomething', 'miid', function () {});
            this.on('setSomething', function () {});
        */
        on: function(event, miid, handler) {
            
            if (arguments.length < 3) {
                handler = arguments[1];
                miid = this.miid;
            }
            
            if (typeof handler == 'function') {
                
                if (!events[miid]) {
                    events[miid] = [];
                }
                
                if (!events[miid][event]) {
                    events[miid][event] = [];
                }
                
                events[miid][event].push(handler);
            }
            
            return this;
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
                        
                        if (events[miid][event][i] === handler) {
                            events[miid][event][i] = null;
                        }
                    }
                } else {
                    events[miid][event] = undefined;
                }
            }
            
            return this;
        },
        
        // emit event
        /*
            this.emit('myEvent', arg1, arg2, ...);
        */
        emit: function(event) {
            
            // slice first argument and apply the others to the callback function
            var args = Array.prototype.slice.call(arguments).slice(1);
            var miid = this.miid;
            
            if (events[miid] && events[miid][event]) {
            
                for (var i = 0, l = events[miid][event].length; i < l; ++i) {
                    
                    if (events[miid][event][i]) {
                        
                        // Fire registred Methods
                        events[miid][event][i].apply(this, args);
                    }
                }
            
            } else {
                
                if (!eventBuffer[miid]) {
                    eventBuffer[miid] = {};
                }
                
                if (!eventBuffer[miid][event]) {
                    eventBuffer[miid][event] = [];
                }
                
                eventBuffer[miid][event].push(args);
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
            
            if (typeof options === 'function') {
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
            
            var handleComplete = function () {
                
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
            };
            
            // request complete callback

            // for browsers that implement XMLHttpRequestEventTarget
            if (typeof link.onload === 'function') {
                link.onload = handleComplete;
            }

            // for browsers implementing only XMLHttpRequest (not XMLHttpRequestEventTarget)
            else {
                link.onreadystatechange = function() {
                    // check if request is complete
                    if (link.readyState == 4) {
                        // TODO BUG: onreadystatechange is called multiple times in Chrome in debug mode
                        //      http://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20Mstone%20ReleaseBlock%20OS%20Area%20Feature%20Status%20Owner%20Summary&groupby=&sort=&id=162837
                        //      http://stackoverflow.com/questions/12761255/can-xhr-trigger-onreadystatechange-multiple-times-with-readystate-done/13585135#13585135
                        if (link.onreadystatechange) {
                            link.onreadystatechange = null;
                            handleComplete();
                        }
                    }
                };
            }
            
            // send data
            link.send(options.data);

            return function() {
                link.A = 1;
                link.abort();
            };
        }
    };
    
    function initModule (target, miid, config) {
        
        // append module to the dom
        if (modules[miid].dom) {
            target.appendChild(modules[miid].dom);
        }
        
        // call module constructor
        if (typeof modules[miid].__init__ === 'function') {
            modules[miid].__init__(config);
        }
        
        // emit buffered events
        if (eventBuffer[miid]) {
            
            for (var event in eventBuffer[miid]) {
                
                for (var i = 0, l = eventBuffer[miid][event].length; i < l; ++i) {
                    modules[miid].emit.apply(modules[miid], event, eventBuffer[miid][event][i]);
                }
            }
            
            eventBuffer[miid] = undefined;
        }
    }
    
    function require (miid, module) {
        
        return function (name) {
            
            if (name.indexOf('..') === 0) {
                
                var namePath = name.split('../');
                var stepBackLenght = namePath.length - 1;
                namePath = namePath.pop();
                
                name = module.base + (module.path.length === stepBackLenght ? namePath : module.path.slice(0, stepBackLenght).join('/') + '/' + namePath);
            
            } else if (name[0] === '.') {
                name = module.base + module.path.join('/') + name.substr(2);
            
            } else {
                
                for (var script in moduleDeps[miid]) {
                    if (script.indexOf(name) > -1) {
                        name = script;
                        break;
                    }
                }
            }
            
            name += name.substr(-3) !== '.js' ? '.js' : '';
            
            if (moduleDeps[miid][name]) {
                return moduleDeps[miid][name].exports;
            }
        };
    };
    
    function evaluateScriptsInOrder (miid, moduleSources, callback) {
        
        // eveluate scripts in order (desc)
        for (var i = (moduleSources.length - 1), l = 0; i >= l; --i) {
            
            if (typeof moduleScripts[moduleSources[i]] === 'function') {
                
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
                    
                    moduleEval[moduleSources[i]] = moduleScripts[moduleSources[i]](require(miid, module), module, module.exports);
                }
                
                // save evaluated module, with miid, scoped
                moduleDeps[miid][moduleSources[i]] = moduleEval[moduleSources[i]];
            }
        }
        
        callback(moduleDeps[miid][moduleSources[0]] ? moduleDeps[miid][moduleSources[0]].exports : null);
    }
    
    function loadJS (miid, moduleSources, callback) {
        
        if (moduleSources.length) {
            
            var length = moduleSources.length;
            
            if (!moduleDeps[miid]) {
                moduleDeps[miid] = {};
            }
            
            var modLoaded = function (event) {
                
                if(--length === 0) {
                    evaluateScriptsInOrder(miid, moduleSources, callback);
                }
            };
            
            var hasModulesToLoad = false;
            for (var i = 0, l = moduleSources.length; i < l; ++i) {
                
                if (!moduleScripts[moduleSources[i]]) {
                    
                    moduleScripts[moduleSources[i]] = 1;
                    hasModulesToLoad = true;
                    
                    var node = document.createElement('script');
                    
                    if (moduleSources[i][0] === '/' || moduleSources[i].indexOf('://') > 0) {
                        node.src = moduleSources[i];
                    } else {
                        node.src = '/@/core/getModule/' + moduleSources[i];
                    }
                    
                    node.addEventListener('load', modLoaded, false);
                    
                    head.appendChild(node);
                
                } else {
                    --length;
                }
            }
            
            if (!hasModulesToLoad) {
                evaluateScriptsInOrder(miid, moduleSources, callback);
            }
        }
    }
    
    // load mono modules
    var constructor = function (target, miid, callback) {
        
        target = typeof target === 'string' ? document.querySelector(target) : target;

        if (typeof callback !== 'function') {
            callback = function() {};
        }

        if (!miid || !target) {
            return callback('Empty miid or module target');
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
                        
                        var href = config.css[i].indexOf('//') > -1 ?
                            href = config.css[i] :
                            href = '/@/core/getFile' + (config.css[i][0] == '/' ? '' : '/') + config.css[i];
                        
                        // create link and append it to the DOM
                        var link = document.createElement('link');
                        var attributes = {
                                rel:    'stylesheet',
                                href:   href
                            };
                            
                        for (var name in attributes) {
                            link.setAttribute(name, attributes[name]);
                        }
                        
                        head.appendChild(link);
                    }
                }
            }
            
            var complete = 0;
            
            // load html
            if (config.html) {
                
                Mono.link('/' + config.html, function (err, html) {
                    
                    // create module container
                    var container = document.createElement('div');
                    
                    // add miid to html
                    container.setAttribute('id', miid);
                    
                    // add html
                    if (html) {
                        container.innerHTML = html;
                    }
                    
                    modules[miid].dom = container;
                    
                    if (++complete === 2) {
                        initModule(target, miid, config);
                    }
                });
                
            } else {
                ++complete;
            }
            
            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                
                loadJS(miid, config.scripts, function (moduleConstructor) {
                    
                    // create module
                    if (config.path) {
                        modules[miid].__init__ = modules[miid].__init__ || moduleConstructor;
                        modules[miid].miid = miid;
                        modules[miid].path = config.path;
                        modules[miid] = Object.extend(modules[miid], Mono);
                        
                        if (++complete === 2) {
                            initModule(target, miid, config);
                        }
                    }
                    
                    callback(null, modules[miid]);
                });
                
            } else if (++complete === 2) {
                initModule(target, miid, config);
            }
        });
    };

    constructor.prepare = function(miid, object) {
        
        modules[miid] = modules[miid] || {};
        
        for (var key in object) {
            modules[miid][key] = object[key];
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
