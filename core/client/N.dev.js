// Copyright Adrian Ottiker. All Rights Reserved.

/**
 * @fileoverview N-client: build and render components.
 * @author adrian@ottiker.com (Adrian Ottiker)
 */

// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {

    //writeable: false, (default value)
    //enumerable: false, (default value)
    //configurable: false, (default value)
    value: function(){

        function O(){}
        O.prototype = this;
        return new O();
    }
});

//tell user, he should update his browser
function UB(){ window.location = "/12/updateBrowser/"; }

// REMOVE WHEN IT GETS OBSOLETE
//checks if browser supports JSON parsing and if querySelector is supported
if (!window.JSON || !window.Element || !document.querySelector) { UB(); } else {

// SUPPORTED IN IE9 > REMOVE WHEN IE8 HAS LOW MARKETSHARE
if (!window.UIEvent) {

    Event.prototype.stopPropagation = function(){ this.cancelBubble = true; };
    Event.prototype.preventDefault = function(){ this.returnValue = false; };
}
if (!Element.prototype.addEventListener) {

    window.addEventListener = Element.prototype.addEventListener = function ( event_name, listener) {

        this.attachEvent( "on" + event_name, listener );
    };

    window.addEventListener = Element.prototype.removeEventListener = function (event_name, listener) {

        this.detachEvent( "on" + event_name, listener );
    };
}
// SUPPORTED IN IE9 > REMOVE WHEN IE8 HAS LOW MARKETSHARE
if (!window.getComputedStyle) {

    window.getComputedStyle = function( elm, pseudo ){

        this.getPropertyValue = function( prop ){

            if (prop == "width" ) return elm.offsetWidth;

            return elm.currentStyle[ prop ];
        };

        return this;
    };
}

//to avoid errors, define a global FormData object
if (!window.FormData ) FormData = Function;

//reset session store
if (!window.name || window.name == "undefined" ) window.name = "";

/**
 * Main Namespace
 * @type {class}
 */
var N = {

    //SUPPORTED IN IE9 > CHANGE TO defineProperty WHEN IE8 HAS LOW MARKETSHARE
    //https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/defineProperty
    /*clone: function(obj) {

        function O(){}
        O.prototype = obj;
        return new O();
    },*/

    // !------------------------------ N.obs
    /**
     * simple observer class
     * @retrun {Observer} instance of the observer Class
     */
    obs: (function(){

        //Class
        var Observer = {

            //Listen to an Event
            l: function(name, method) {

                var events = this.e;

                if (typeof method == 'function') {

                    if (!events[name]) {

                        events[name] = [];
                    }

                    events[name].push(method);
                }
            },

            //Fire Event
            f: function(name) {

                var events = this.e[name];

                //Fire registred Methods
                if (events) {

                    //slice first argument and apply the others to the callback function
                    var args = Array.prototype.slice.call(arguments).slice(1);

                    for (var i = 0, l = events.length; i < l; ++i) {

                        if (events[i]) {

                            events[i].apply(null, args);
                        }
                    }
                }
            },

            //Remove Event
            r: function(event, handler) {

                if (this.e[event]) {

                    if (handler) {

                        for (var i = 0, l = this.e[event].length; i < l; ++i) {

                            if (this.e[event][i] == handler) {

                                this.e[event][i] = null;
                            }
                        }
                    }
                    else {

                        delete this.e[event];
                    }
                }
            }
        },

        //obeserver chache
        observers = {};

        //return existing observer or return new Observer
        return function(name) {

            if (observers[name]) {

                return observers[name];
            }
            else {

                var obs = Observer.clone();
                obs.e = {};

                return name ? observers[name] = obs : obs;
            }
        };
    })(),

    // !------------------------------ N.dom
    /**
     * Mini DOM-Library
     */
    dom: (function(win, doc, element_prototype) {

        //add bind methode to all HTML Elements
        win.bind = element_prototype.bind = function(event_name, handler) {

            this.addEventListener(event_name, handler, false);
            return this;
        };

        //add unbind method to all HTML Elements
        win.unbind = element_prototype.unbind = function( event_name, handler) {

            this.removeEventListener(event_name, handler, false);
            return this;
        };

        //add attribute to element
        element_prototype.addAttr = function(attributes, value) {

            if(value) {

                this.setAttribute( attributes, value);
            }
            else for (var name in attributes) {

                if (attributes[name].split) {

                    attributes[name] = attributes[name].split(" ");
                }

                value = this.getAttribute(name) || "";

                for (var i = 0, l = attributes[name].length; i < l; ++i) {

                    if (value.indexOf(attributes[name][i]) < 0) {

                        value += (value.length > 0 ? " " : "") + attributes[name][i];
                    }
                }

                this.setAttribute(name, value);
            }

            return this;
        };

        //remove attribute from element
        element_prototype.rmAttr = function(attributes, value) {

            if (typeof attributes == "string") {

                this.removeAttribute(attributes);
            }
            else for (var name in attributes) {

                if (attributes[name].split) {

                    attributes[name] = attributes[name].split(" ");
                }

                value = (this.getAttribute(name) || "").split(" ");

                for (var i = 0, l = value.length, new_value = [], ok; i < l; ++i) {

                    ok = 1;

                    for (var n = 0, c = attributes[name].length; n < c; ++n) {

                        if (value[i] == attributes[name][n]) {

                            ok = 0;
                        }
                    }

                    if (ok) {

                        new_value.push(value[i]);
                    }
                }

                if (!new_value.length) {

                    this.removeAttribute(name);
                }
                else {

                    this.setAttribute(name, new_value.length < 2 ? value[0] : new_value.join(" "));
                }
            }

            return this;
        };

        function fill(item, content, text) {

            if (item.type == "checkbox" || item.type == "radio") {

                item.checked = content ? true : false;
            }
            else if(item.tagName.toLowerCase() == "input") {

                item.value = content;
            }
            else try {

                if (text) {

                    //NOT SUPPORTED IN IE8
                    item.textContent = content;
                }
                else {

                    item.innerHTML = content;
                }
            }
            catch( e ){}
        }

        return {

            find: function(query, element) {

                return (element || doc).querySelectorAll(query);
            },

            findOne: function(query, element) {

                return (element || doc).querySelector(query);
            },

            elm: function(element_name, attrs) {

                var elm = doc.createElement(element_name);

                if (attrs) {

                    for (var name in attrs) {

                        elm.setAttribute(name, attrs[name]);
                    }
                }

                return elm;
            },

            set: function(dom, content, text) {

                if (dom) {

                    if (dom[0] instanceof Element) {

                        for (var i = 0, l = dom.length; i < l; ++i) {

                            fill(dom[i], content, text);
                        }
                    }
                    else {

                        fill(dom, content, text);
                    }
                }
            },

            addAttr: function(dom, attrs, value) {

                if (dom) {

                    if (dom[0] instanceof Element) {

                        for (var i = 0, l = dom.length; i < l; ++i) {

                            dom[i].addAttr(attrs, value);
                        }
                    }
                    else {

                        dom.addAttr(attrs, value);
                    }
                }
            },

            rmAttr: function(dom, attrs) {

                if (dom) {

                    if (dom[0] instanceof Element) {

                        for(var i = 0, l = dom.length; i < l; ++i) {

                            dom[i].rmAttr(attrs);
                        }
                    }
                    else {

                        dom.rmAttr(attrs);
                    }
                }
            }
        };

    })(window, document, Element.prototype),

    // !------------------------------ N.link
    /**
     * handles asynchronous/synchronous binary or text-based communication
     * Returns a configured Link
     * @public
     * @param {object} configuration options for the link
     * @param {function} callback function
     * @return {XMLHttpRequest}
     *
     * options: {
     *
     *        url:      {string}    the url
     *        sync:     {boolean}   if true the request will block all other browser actions
     *        upload:   {function}  first argument: percent of loaded data, second argument: XMLHttpRequestProgressEvent
     *        download: {function}  first argument: percent of loaded data, second argument: XMLHttpRequestProgressEvent
     * }
     */
    link: function(options, callback) {

        var self = this,
            link = new XMLHttpRequest(); //create new link

        if (link && options && options.url) {

            //open the connection
            link.open(options.data ? "post" : "get", N.ok + options.url, !options.sync);

            //set session id in http header
            if (window.name) {

                link.setRequestHeader("x-sid", window.name);
            }

            //handle FormData
            if (options.data && options.data instanceof FormData === false) {

                try {

                    //set content-type header to application/json
                    link.setRequestHeader("content-type", "application/json");

                    //stringify object to JSON
                    options.data = JSON.stringify(options.data);

                } catch(err) {

                    //abort request
                    link.abort();

                    //fire callback with error
                    if (callback) {

                        callback(err);
                    }

                    //exit function
                    return;
                }
            }

            //attach callback to upload progress event
            if (link.upload && options.up) {

                link.upload.onprogress = options.up;
            }

            //attach callback to download progress event
            if (options.down) {

                link.onprogress = options.down;
            }

            //request complete callback
            link.onreadystatechange = function() {

                //check if request is complete
                if (link.readyState == 4) {

                    //get error message
                    var err = link.A ? "A" : link.status < 400 ? null : link.responseText || "E",
                        sid = link.getResponseHeader("x-sid");

                    //reset abort status
                    link.A = 0;

                    //set/reset session id on client
                    if (sid) {

                        window.name = sid == "N" ? "" : sid;
                    }

                    if (callback) {

                        var response = null;

                        if (!err) {

                            //parse result as JSON
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

                        //fire callback
                        callback(err, response, link);
                    }
                }
            };

            //send data
            link.send(options.data);

            return function() {

                link.A = 1;
                link.abort();
            };
        }
    },

    // !------------------------------ N.css
    /**
     * Load css Files
     * @param {string} url to css file
     */
    css: function(file) {

        //create link and append it to the DOM
        N.dom.findOne("head").appendChild(

            N.dom.elm("link", {
                rel:    "stylesheet",
                type:   "text/css",
                href:   N.ok + "/core/module/getFile/" + file
            })
        );
    },

    // !------------------------------ N.comp
    /**
     * Create Instances of Modules
     */
    // TODO Module Instace ID
    mod: function(target, moduleId, callback) {

        //default argument values
        callback = (typeof callback == "function" ? callback : function() {});
        target = (typeof target == "string" ? N.dom.findOne(target) : target);

        //error checks
        if (!target) {
            return callback("Target not found or undefined.");
        }
        if (typeof moduleId === "undefined") {
            return callback("Component ID undefined.");
        }

        //get module
        N.link({ url: "/core/module/getConfig/" + moduleId }, function(err, response) {

            //error checks
            if (err || !response) {
                callback("A problem occurred while getting module.");
                return;
            }

            target.style.display = "none";

            //TODO show loader

            // render html from response[1]
            if (response[1]) {
                target.innerHTML = response[1];
            }

            // load css from response[2]
            for (var i in response[2]) {
                N.css(response[2][i]);
            }

            // load, clone and init modules
            // TODO load main from config if exists
            require([moduleId + "/main"], function(module) {

                var clone = module.clone();
                
                clone.module = module;
                clone.$ = target;
                
                // TODO create observer with user defined id (only for GUI)
                clone.obs = N.obs(moduleId)

                // TODO register module state

                // init module
                if (clone.init) {
                    clone.init(response[0]);
                }

                // TODO: hide loader
                // TODO: init state

                target.style.display = "block";

                callback(null, clone);
            });
        });
    },

    state: (function() {

        /*
            1. register all module states to N.states or whatever..
            2. onchange go through all module states
            3. handle browser history

            every module has his own state map object.
            listen to onhashchange.

            create a api function to change hashes?

            example of a map = {

                '/path/x': {

                    //activate this state if dom event was fired
                    events: [

                        ["#selector", "click"]
                    ],

                    //execute methods if state is activated
                    methods: [

                        ["getItems", ["param1", "param2"]]
                    ],

                    //activate viewstates if state is activated
                    viewStates: ["listEmpty"]
                }
            }
        */

        var states = {

            /*URI: [state]*/
        };

        return function() {

            //events
            //methods
            //viewstates
        };
    })()
};

// TODO: send error to server
window.onerror = function(error, url, line) {

    console.log( error + "\n" + url + "\n" + line );
};
}
