//Copyright Adrian Ottiker. All Rights Reserved.

/**
 * @fileoverview N-client: build and render components.
 * @author adi@ottiker.com (Adrian Ottiker)
 */

// extend Object prototype with clone function
/*Object.defineProperty(Object.prototype, "clone", {

    value: function() {

        function O(){}
        O.prototype = this;
        return new O();
    }
});*/

// TODO send error to server
window.onerror = function(error, url, line) {

    //console.log( error + "\n" + url + "\n" + line );
};

/**
 * Main Namespace
 * @type {object}
 */
var N = {
    
    clone: function(obj){

        function O(){}
        O.prototype = obj;
        return new O();
    },
    
    err: function(msg) {
        
        throw new Error(msg);  
    },

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

                var obs = N.clone(Observer);
                obs.e = {};

                return name ? observers[name] = obs : obs;
            }
        };
    })(),

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
     *      miid:     {string}    module instance id
     *      path:     {string}    the url
     *      data:     {object}    post data
     *      sync:     {boolean}   if true the request will block all other browser actions
     *      upload:   {function}  first argument: percent of loaded data, second argument: XMLHttpRequestProgressEvent
     *      download: {function}  first argument: percent of loaded data, second argument: XMLHttpRequestProgressEvent
     * }
     */
    
    link: function(method, options, callback) {
        
        if (typeof method !== "string") {
            
            N.err("Operation Method is mandatory");
        }
        
        if (typeof options === "function") {
            
            callback = options;
            options = {};
        }
        
        if (!options.miid && !this.miid) {
            
            N.err("Module Instance ID (miid) is mandatory");
        }
        
        var link = new XMLHttpRequest(); //create new link

        if (link) {
            
            var url = N.ok + "/" + (this.miid || options.miid) + "/" + method + (options.path || options.path === "" ? "/" + options.path : "") + (options.query || "");
            
            //open the connection
            link.open(options.data ? "post" : "get", url, !options.sync);
            
            //handle data
            if (options.data && !(typeof FormData !== "undefined" && options.data instanceof FormData)) {

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

                        N.err(err);
                    }

                    //exit function
                    return;
                }
            }

            //attach callback to upload progress event
            if (link.upload && options.upload) {

                link.upload.onprogress = options.upload;
            }

            //attach callback to download progress event
            if (options.downlaod) {

                link.onprogress = options.download;
            }

            //request complete callback
            link.onreadystatechange = function() {

                //check if request is complete
                if (link.readyState == 4) {

                    //get error message
                    var err = link.A ? "A" : link.status < 400 ? null : link.responseText || "E";

                    //reset abort status
                    link.A = 0;

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

    // !------------------------------ N.login
    /**
     * Wrapper for link with login core operation
     * @param {string} user name
     * @param {string} password
     * @param {function} callback
     */
    login: function(username, password, callback) {

        var linkData = {
            miid: "core",
            data: {
                user: username,
                pass: password
            }
        };

        N.link("login", linkData, callback);
    },

    // !------------------------------ N.logout
    /**
     * Wrapper for link with logout core operation
     * @param {function} callback
     */
    logout: function(callback) {

        N.link("logout", { miid: "core" }, callback);
    },

    // !------------------------------ N.css
    /**
     * Load css Files
     * @param {string} url to css file
     */
    css: function(file) {

        //create link and append it to the DOM
        var head = document.getElementsByTagName("head")[0],
            link = document.createElement("link"),
            attr = {
                rel:    "stylesheet",
                type:   "text/css",
                href:   N.ok + "/core/getFile/" + file
            };
        
        for (var name in attr) {
            
            link.setAttribute(name, attr[name]);
        }
        
        head.appendChild(link);
    },

    // !------------------------------ N.comp
    /**
     * Create Instances of Modules
     */
    mod: function(target, miid, callback) {
        
        //default argument values
        callback = (typeof callback == "function" ? callback : function() {});
        target = (typeof target === "string" ? document.getElementById(target) : target);
        
        //error checks
        if (!target) {
            return callback("Target not found or undefined.");
        }
        if (!miid) {
            return callback("Component ID undefined.");
        }
        
        //get module
        N.link("getConfig", {miid: "core", path: (N.em ? miid + "/" + N.em : miid)}, function(err, response) {
            
            if (N.em) {
            
                miid = N.em;
                delete N.em;
            }
            
            //error checks
            if (err || !response) {
                
                return callback(err || "Empty response");
            }

            target.style.display = "none";
            
            var div = document.createElement("div");
            
            //add miid to html
            div.setAttribute("id", miid);
            
            //TODO show loader

            // render html from response[1]
            if (response[1]) {
                div.innerHTML = response[1];
            }

            // load css from response[2]
            for (var i in response[2]) {
                N.css(response[2][i]);
            }
            
            // TODO handle requirejs errors
            /*require.onError = function(){
                
                target.style.display = "block";
                callback(null, clone);
            };*/

            // load, clone and init modules
            require([response[0].owner + "/" + response[0].name + "/main"], function(module) {
                
                var clone = N.clone(module);
                
                clone.miid = miid;
                clone.$ = div;
                clone.link = N.link;
                clone.config = response[0];
                
                // TODO create observer with user defined id (only for GUI)
                clone.obs = N.obs(miid);

                // TODO register module state
                
                // init module
                if (clone.init) {
                    clone.init(response[0]);
                }

                // TODO: hide loader
                // TODO: init state
                
                target.appendChild(div);
                target.style.display = "block";

                callback(null, clone);
            });
        });
    }/*,
    
    state: (function() {

        
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
        

        var states = {

            //URI: [state]
        };

        return function() {

            //events
            //methods
            //viewstates
        };
    })()
    */
};
