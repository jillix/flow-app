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
    
    // define operation key
    var operationKey = "@";
    
    // module cache
    var modules = {};
    
    // event cache
    var events = {};
    
    // get head reference
    var head = document.getElementsByTagName("head")[0];
    
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
        
        // emit event on module
        /*
            this.emit("setSomething", arg1, arg2, ...);
        */
        emit: function(event) {
            
            if (!events[this.miid] || !events[this.miid][event]) {
                
                return this;
            }
            
            var moduleEvents = events[this.miid][event];
            
            // slice first argument and apply the others to the callback function
            var args = Array.prototype.slice.call(arguments).slice(1);
            
            for (var i = 0, l = moduleEvents.length; i < l; ++i) {
                
                if (moduleEvents[i]) {
                    
                    // Fire registred Methods
                    moduleEvents[i].apply(this, args);
                }
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
            
            if (link) {
                
                var url = operationKey + "/" + (options.miid || this.miid) + "/" + method + (options.path || options.path === "" ? "/" + options.path : "") + (options.query || "");
                
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
            
                // request complete callback
                link.onreadystatechange = function() {
                
                    //check if request is complete
                    if (link.readyState == 4) {
            
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
                    }
                };
                
                // send data
                link.send(options.data);
                
                return function() {
                    
                    link.A = 1;
                    link.abort();
                };
            }
        }
    };
    
    // load mono modules
    return function (target, miid) {
        
        target = target instanceof Element ? target : document.querySelector(target);
        
        if (!miid || !target) {
            
            return;
        }
        
        Mono.link("getConfig", {miid: "core", path: miid}, function (err, config) {
            
            // error checks
            if (err || !config) {
                
                return;
            }
            
            // load css
            for (var i in config.css) {
                
                var href;
                
                if (config.css[i].indexOf("http") > -1) {
                    
                    href = config.css[i];
                }
                else {
                    
                    href = operationKey + "/core/getFile" + (config.css[i][0] == "/" ? "" : "/") + config.css[i]
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
                    lang:   config.lang,
                    path:   config.path
                    
                }, Mono);
                
                // call module constructor
                if (typeof module === "function") {
                    
                    module.call(modules[miid], config.conf);
                }
            });
        });
    };
})();
