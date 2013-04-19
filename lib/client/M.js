// Copyright Adrian Ottiker (adrian@ottiker.com). All Rights Reserved.

// TODO not working in new browsers with the XHR onload IE8 fix
//"use strict";

// TODO send error to server
//window.onerror = function(error, url, line) {};

// exent object (object inherits from inherit)
Object.extend = function(object, inherit) {
    
    var Module = function(properties) {
    
        if (typeof properties === "object") {
        
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
    var head = document.getElementsByTagName("head")[0];
    
    // set operation key
    var ok = '@'
    
    // module class
    var Mono = {

        // listen to events
        /*
            this.on("setSomething", "miid", function () {});
            this.on("setSomething", function () {});
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
            this.off("setSomething", "miid", function () {});
            this.off("setSomething", function () {});
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
                    delete events[miid][event];
                }
            }
            
            return this;
        },
        
        // emit event
        /*
            this.emit("myEvent", arg1, arg2, ...);
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
            this.link("operationName", function() {});
            this.link("operationName", OPTIONS, function () {});
            
            OPTIONS: {
                
                miid: "miid",
                path: "path/to/some/thing",
                data: {POST DATA},
                upload: function () {},
                download: function () {}
            }
        */
        link: function(method, options, callback) {
            
            if (typeof method === "object") {
                callback = options;
                options = method;
                method = options.name;
                delete options.name;
            }
            
            if (typeof options === "function") {
                callback = options;
                options = {};
            }
            else if (!options) {
                options = {};
            }
            
            if (typeof method !== "string" || !options.miid && !this.miid) {
                return;
            }
            
            // create new link
            var link = new XMLHttpRequest();
            if (!link) {
                return;
            }

            var url = "/" + ok + "/" + (options.miid || this.miid) + "/" + method + (options.path || options.path === "" ? "/" + options.path : "") + (options.query || "");
            
            // open the connection
            link.open(options.data ? "post" : "get", url, !options.sync);
            
            // handle data
            if (options.data && !(typeof FormData !== "undefined" && options.data instanceof FormData)) {
        
                try {
                    // set content-type header to application/json
                    link.setRequestHeader("content-type", "application/json");
        
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
                var err = link.A ? "A" : link.status < 400 ? null : link.responseText || "E";
    
                // reset abort status
                link.A = 0;
    
                if (callback) {
    
                    var response = null;
    
                    // parse result as JSON
                    if ((link.getResponseHeader("content-type") || "").indexOf("application/json") > -1) {

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
        if (typeof modules[miid].__init__ === "function") {
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
    
    function evaluateScriptsInOrder (miid, moduleSources, callback, require) {
        
        // eveluate scripts in order (desc)
        for (var i = (moduleSources.length - 1), l = 0; i >= l; --i) {
            
            if (typeof moduleScripts[moduleSources[i]] === 'function') {
                
                // evaluate module script
                if (!moduleEval[moduleSources[i]]) {
                    var module = {exports: {}};
                    moduleEval[moduleSources[i]] = moduleScripts[moduleSources[i]](require, module, module.exports);
                }
                
                // save evaluated module, with miid, scoped
                moduleDeps[miid][moduleSources[i]] = moduleEval[moduleSources[i]];
            }
        }
        
        callback(moduleDeps[miid][moduleSources[0]]);
    }
    
    function loadJS (miid, moduleSources, callback) {
        
        if (moduleSources.length) {
            
            var length = moduleSources.length;
            
            if (!moduleDeps[miid]) {
                moduleDeps[miid] = {};
            }
            
            // TODO relative paths
            var require = function (name) {
                
                if (name.indexOf('.') === 0) {
                    // handle relative paths..
                }
                
                for (var script in moduleDeps[miid]) {
                    
                    if (script.indexOf(name) > -1) {
                        return moduleDeps[miid][script];
                    }
                }
            };
            
            var modLoaded = function (event) {
                
                if(--length === 0) {
                    evaluateScriptsInOrder(miid, moduleSources, callback, require);
                }
            };
            
            var hasModulesToLoad = false;
            for (var i = 0, l = moduleSources.length; i < l; ++i) {
                
                if (!moduleScripts[moduleSources[i]]) {
                    
                    moduleScripts[moduleSources[i]] = 1;
                    hasModulesToLoad = true;
                    
                    var node = document.createElement("script");
                    node.type = "text/javascript";
                    node.charset = "utf-8";
                    node.async = true;
                    
                    if (moduleSources[i].indexOf('/') === 0 || moduleSources[i].indexOf('://') > 0) {
                        node.src = moduleSources[i];
                    } else {
                        node.src = '/' + ok + '/core/getModule/' + moduleSources[i];
                    }
                    
                    node.addEventListener("load", modLoaded, false);
                    node.addEventListener("error", function () {}, false);
                    
                    head.appendChild(node);
                
                } else {
                    --length;
                }
            }
            
            if (!hasModulesToLoad) {
                evaluateScriptsInOrder(miid, moduleSources, callback, require);
            }
        }
    }
    
    // load mono modules
    var constructor = function (target, miid, callback) {
        
        //target = target instanceof Element ? target : document.querySelector(target);
        target = typeof target === "string" ? document.querySelector(target) : target;

        if (typeof callback !== "function") {
            callback = function() {};
        }

        if (!miid || !target) {
            return callback(!miid ? "Empty miid not allowed" : "Could not determine module target");
        }

        Mono.link("getConfig", { miid: "core", path: miid }, function (err, config) {
            
            if (typeof config !== 'object') {
                callback(new Error('Invalid module config.'));
            }
            
            modules[miid] = modules[miid] || {};
            
            // load css
            if (config.css) {
                
                for (var i in config.css) {
                    
                    if (!css[config.css[i]]) {
                        
                        css[config.css[i]] = 1;
                        
                        var href = config.css[i].indexOf("http") > -1 ?
                            href = config.css[i] :
                            href = "/" + ok + "/core/getFile" + (config.css[i][0] == "/" ? "" : "/") + config.css[i];
                        
                        // create link and append it to the DOM
                        var link = document.createElement("link");
                        var attributes = {
                                rel:    "stylesheet",
                                type:   "text/css",
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
            // TODO load html with link
            if (config.html) {
                
                var htmlReq = new XMLHttpRequest();
                htmlReq.open("get", config.html);

                function handleComplete (html) {
                    
                    // create module container
                    var container = document.createElement("div");
                    
                    // add miid to html
                    container.setAttribute("id", miid);
                    
                    // add html
                    if (htmlReq.responseText) {
                        container.innerHTML = htmlReq.responseText;
                    }
                    
                    modules[miid].dom = container;
                    
                    if (++complete === 2) {
                        initModule(target, miid, config);
                    }
                };

                // for browsers that implement XMLHttpRequestEventTarget
                if (typeof htmlReq.onload === 'function') {
                    htmlReq.onload = handleComplete;
                }

                // for browsers implementing only XMLHttpRequest (not XMLHttpRequestEventTarget)
                else {
                    htmlReq.onreadystatechange = function() {
                        // check if request is complete
                        if (htmlReq.readyState == 4) {
                            // TODO BUG: onreadystatechange is called multiple times in Chrome in debug mode
                            //      http://code.google.com/p/chromium/issues/detail?can=2&start=0&num=100&q=&colspec=ID%20Pri%20Mstone%20ReleaseBlock%20OS%20Area%20Feature%20Status%20Owner%20Summary&groupby=&sort=&id=162837
                            //      http://stackoverflow.com/questions/12761255/can-xhr-trigger-onreadystatechange-multiple-times-with-readystate-done/13585135#13585135
                            if (htmlReq.onreadystatechange) {
                                htmlReq.onreadystatechange = null;
                                handleComplete(htmlReq.responseText);
                            }
                        }
                    };
                }

                htmlReq.send();
                
            } else {
                ++complete;
            }
            
            // load javascript
            var modulesToLoad = [];
            
            // load main module script
            if (!modules[miid].__init__ && config.path) {
                modulesToLoad.push(config.path);
            }
            
            // load scripts
            if (config.scripts && config.scripts.length) {
                 modulesToLoad = modulesToLoad.concat(config.scripts);
            }
            
            // load and init module
            if (modulesToLoad.length > 0) {
                
                //require(modulesToLoad, function (moduleConstructor) {
                loadJS(miid, modulesToLoad, function (moduleConstructor) {
                    
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
        
        for (var key in object) {
            var value = object[key];
           
            modules[miid] = modules[miid] || {};

            modules[miid][key] = value;
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
