//Copyright Adrian Ottiker (adrian@ottiker.com). All Rights Reserved.

"use strict";

// TODO send error to server
/*window.onerror = function(error, url, line) {
    
    console.log(error + "\n" + url + "\n" + line);
};
// TODO handle requirejs errors
require.onError = function(err){
    
    console.log(err);
};*/

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
    
    // event cache
    var events = {};
    
    // get head reference
    var head = document.getElementsByTagName("head")[0];
    
    // emit events
    function eventEmitter(module, event, miid, args, sliceCount) {
        
        if (events[miid] && events[miid][event]) {
        
            var moduleEvents = events[miid][event];
            
            // slice first argument and apply the others to the callback function
            args = Array.prototype.slice.call(args).slice(sliceCount);
            
            for (var i = 0, l = moduleEvents.length; i < l; ++i) {
                
                if (moduleEvents[i]) {
                    
                    // Fire registred Methods
                    moduleEvents[i].apply(module, args);
                }
            }
        }
        
        return module;
    }
    
    // module class
    var Mono = {
        
        // define operation key
        ok: "@",
        
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
            
            if (events[miid]) {
                
                if (events[miid][event]) {
                    
                    if (handler) {
                        
                        for (var i = 0, l = events[miid][event].length; i < l; ++i) {
                            
                            if (events[miid][event][i] === handler) {
                                
                                events[miid][event][i] = null;
                            }
                        }
                    }
                    else {
                        
                        delete events[miid][event];
                    }
                }
            }
            
            return this;
        },
        
        // emit event (this.miid)
        /*
            this.emit("setSomething", arg1, arg2, ...);
        */
        emit: function(event) {
            
            return eventEmitter(this, event, this.miid, arguments, 1);
        },
        
        // trigger event on a module
        /*
            this.trigger("setSomething", "miid", arg1, arg2, ...);
        */
        trigger: function(event, miid) {
            
            return eventEmitter(this, event, miid, arguments, 2);
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

            var url = this.ok + "/" + (options.miid || this.miid) + "/" + method + (options.path || options.path === "" ? "/" + options.path : "") + (options.query || "");
            
            // open the connection
            link.open(options.data ? "post" : "get", url, !options.sync);
            link.setRequestHeader("Accept-Language", language);
            
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
    
                    if (!err) {
    
                        // parse result as JSON
                        if ((link.getResponseHeader("content-type") || "").indexOf("application/json") > -1) {
    
                            try {
    
                                response = JSON.parse(link.responseText);
                            }
                            catch (e) {
    
                                err = e;
                            }
                        }
                        else {
    
                            response = link.responseText;
                        }
                    }

                    // fire callback
                    callback(err, response, link);
                }
            };
            
            // request complete callback

            // for browsers that implement XMLHttpRequestEventTarget
            if (link.hasOwnProperty('onload')) {
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
                            delete link.onreadystatechange;
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

    // load mono modules
    return function (target, miid, callback) {

        //target = target instanceof Element ? target : document.querySelector(target);
        target = typeof target === "string" ? document.querySelector(target) : target;

        if (typeof callback != "function") {
            callback = function() {};
        }

        if (!miid || !target) {
            return callback(!miid ? "Empty miid not allowed" : "Could not determine module target");
        }

        Mono.link("getConfig", { miid: "core", path: miid }, function (err, result) {

            // error checks
            if (err || !result) {
                return callback(err || "Empty response");
            }

            function loadModule(config) {
            
                // load scripts
                if (config.scripts && config.scripts.length) {
                    require(config.scripts);
                }

                // load css
                if (config.css) {
                    
                    for (var i in config.css) {
                        
                        var href;
                        
                        if (config.css[i].indexOf("http") > -1) {
                            
                            href = config.css[i];
                        }
                        else {
                            
                            href = Mono.ok + "/core/getFile" + (config.css[i][0] == "/" ? "" : "/") + config.css[i]
                        }
                        
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
                
                // load and init module
                require([config.path + "/" + (config.file || "main")], function (module) {
                    
                    // create module container
                    var container = document.createElement("div");
                    
                    // add miid to html
                    container.setAttribute("id", miid);
                    
                    // add html
                    if (config.html) {
                        container.innerHTML = config.html;
                    }
                    
                    // append module to the dom
                    target.appendChild(container);

                    // create module
                    modules[miid] = Object.extend({
                        dom:    container,
                        miid:   miid,
                        lang:   language,
                        path:   config.path
                        
                    }, Mono);
                    
                    // call module constructor
                    if (typeof module === "function") {
                        
                        module.call(modules[miid], config);
                    }
                    
                    callback(null, modules[miid]);
                });
            }

            switch (result.type) {
                case "config":
                    if (typeof result.data !== "object") {
                        return callback("M config response data type must be an object");
                    }
                    loadModule(result.data);
                    break;

                //case "miid":
                //    if (typeof result.data !== "string") {
                //        return callback("M miid response data type must be a string");
                //    }
                //    M(target, result.data, callback);
                //    break;

                //case "text":
                //    if (typeof result.data !== "string") {
                //        return callback("M text response data type must be a string");
                //    }
                //    target.innerHTML = result.data;
                //    break;

                default:
                    return callback("Invalid response type: " + result.type);
            }
        });
    };
})();

