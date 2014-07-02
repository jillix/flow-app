// global module loader
(function(modules, cache, wsCache, css, fn, win, doc) {

    // check browser features and route to a "update your browser site"
    if (!win.WebSocket || !win.history) {
        win.location = 'http://browsehappy.com/';
        return;
    }

    // ---------------------------------------------------------------- POPSTATE

    // emit url event on popstate event
    win.addEventListener('popstate', function () {
        cache.I.Z.route('', true);
    }, false);

    // --------------------------------------------------------------- WEBSOCKET

    // create websocket
    var webSocket = new WebSocket('ws://' + win.location.host + '/');

    // ----------------------------------------------------------------- CLASSES

    var classes = {

        // instance
        I: {
            Z: {
                // load and set up elements
                load: function (type, name, callback) {

                    // get instance name from host
                    if (!type) {
                        type = 'I';
                        name = win.location.hostname.replace(/\./g, '_');
                    }

                    var self = this;
                    var factory = factories[type];
                    var clone;
                    var cacheKey;
                    var sendEvent = type === 'I' ? 'inst' : type === 'V' ? 'view' : type === 'M' ? 'model' : null;

                    // ensure callback
                    callback = callback || function () {};

                    // manual config
                    if (typeof name === 'object') {
                        return factoryHandler.call(self, factory, self.clone(classes[type]), name, callback);
                    }

                    // create cache key
                    cacheKey = name instanceof Array ? name.join() : name;

                    // get item from cache
                    if (cache[type][cacheKey]) {
                        return callback(null, cache[type][cacheKey]);
                    }

                    // create clone
                    clone = cache[type][cacheKey] = self.clone(classes[type]);

                    // get factor config from server
                    self.emit(sendEvent + '>', null, name, function (err, config) {

                        if (err) {
                            return callback(err);
                        }

                        // call factory
                        factoryHandler.call(self, factory, clone, config, callback);
                    });
                },

                // route to url
                route: function (url, fromPopstate) {
                    // TODO what about the URL queries and hashes?
                    // TODO relative urls ./ ../
                    var self = this;

                    // normalize pathname
                    var pathname = location.pathname;
                    pathname += pathname[pathname.length - 1] === '/' ? '' : '/';

                    // normalize url
                    url = url || pathname;
                    url += url[url.length - 1] === '/' ? '' : '/';

                    // // push state only when url changes
                    // TODO IDEA maybe we can handle relatives urls easy by push a new url, then read and use the readed url (absolute) as event?
                    if (url !== pathname) {
                        history.pushState(0, 0, url);
                    }

                    // create state event object
                    var stateEvent = {
                        url: url,
                        pth: url.split('/').slice(1, -1),
                        pop: fromPopstate,
                        ori: self.name,
                        _rt: true
                    };

                    // emit route events on all instances
                    for (var instance in cache.I) {

                        // emit only when a instance is ready and the url changed. emit always on the origin instance.
                        if (!cache.I[instance].Z.ready || (cache.I[instance].Z.name !== stateEvent.ori && cache.I[instance].Z.url === url)) {
                            continue;
                        }

                        // set current url
                        cache.I[instance].Z.url = url;

                        // emit url route event
                        cache.I[instance].Z.emit.call(cache.I[instance], url, stateEvent);

                        // emit general route event
                        cache.I[instance].Z.emit.call(cache.I[instance], 'route', stateEvent);
                    }
                },

                // emit event
                emit: function(event) {

                    // mark instance as ready
                    if (event === 'ready') {
                        this.Z.ready = true;
                    }

                    var self = this;
                    var events = self.events;

                    // slice first argument
                    var args = this.toArray(arguments).slice(1);

                    // index for events that must be removed
                    var rm = [];
                    var route;

                    for (var _event in events) {

                        // compare event or test regex
                        if (_event === event || events[_event].re.test(event)) {

                            // check if event is a route event
                            route = args[0] && args[0]._rt;

                            // call handlers
                            for (var i = 0; i < events[_event].length; ++i) {
                                if (events[_event][i]) {

                                    // call registered Methods
                                    events[_event][i].apply(self._, args);

                                    // remove from event buffer, if once is true
                                    if (events[_event][i]._1) {
                                        events[_event][i] = null;
                                        rm.push([_event, i]);
                                    }
                                }
                            }

                            // routes on the same instance are unique, this prevents
                            // regexp overlapping on complicated routes
                            if (route) {
                                break;
                            }
                        }
                    }

                    // remove unused events
                    remove(events, rm);
                },

                // listen to events
                on: function listen (event, handler, once) {
                    var self = this;
                    var events = self.events = self.events || {};

                    // get handler from a path
                    if (typeof handler !== fn) {
                        handler = self.path(handler);
                    }

                    if (typeof handler === fn) {

                        // fire ready event immediately if instance is ready
                        if (event === 'ready' && self.ready) {
                            return handler.call(self);
                        }

                        if (!events[event]) {
                            events[event] = [];

                            // create regexp pattern
                            events[event].re = new RegExp(event);
                        }

                        handler._1 = once;
                        events[event].push(handler);
                    }
                },

                // remove listeners
                off: function (event, handler) {
                    var events = this.events;

                    if (events[event]) {

                        if (handler) {
                            var rm = [];

                            for (var i = 0; i < events[event].length; ++i) {
                                if (events[event][i] === handler) {
                                    events[event][i] = null;
                                    rm.push([event, i]);
                                }
                            }

                            remove(events, rm);

                        } else {
                            delete events[event];
                        }
                    }
                },

                // emit an event on a instance
                push: function (instance, event) {
                    if (cache.I[instance]) {
                        cache.I[instance].Z.emit.apply(cache.I[instance], this.toArray(arguments).slice(1));
                    }
                },

                // emit on all instances
                spill: function (event) {
                    var args = this.toArray(arguments);
                    for (var instance in cache.I) {
                        cache.I[instance].Z.emit.apply(cache.I[instance], args);
                    }
                },

                // clone object
                clone: function (object) {
                    var O = function() {};
                    O.prototype = object || {};
                    return new O();
                },

                // this.path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
                path: function (path, scope, stop) {

                    var o = path;
                    path = path.split('.');
                    scope = scope || this._;

                    // find keys in paths or return
                    for (var i = 0; i < path.length; ++i) {
                        if (!(scope = scope[path[i]])) {
                            return stop ? null : this.path(o, win, true);
                        }
                    }

                    return scope;
                },

                // convert object to arrays
                toArray: function (object) {
                    return Array.prototype.slice.call(object);
                },

                // flat objects
                flat: function (object) {
                    var output = {};

                    function step(obj, prev) {
                        for (var key in obj) {
                            var value = obj[key];
                            var newKey = prev + key;

                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {

                                if (Object.keys(value).length) {
                                    step(value, newKey + '.');
                                    continue;
                                }
                            }

                            output[newKey] = value;
                        }
                    }

                    step(object, '');

                    return output;
                },

                // random string generator
                uid: function (len) {
                    len = len || 23;
                    for (var i = 0, random = ''; i < len; ++i) {
                        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
                    }
                    return random;
                },

                // reset and reload
                // TODO check memory leaks
                reload: function (keepDom) {

                    // reset cache, but backup core instance
                    cache = {
                        I: {Z: Z},
                        V: {},
                        M: {}
                    };

                    // reset websockets callback cache
                    wsCache = {};

                    // reset html
                    if (!keepDom) {
                        doc.body.innerHTML = '';
                    }

                    // load root instance
                    Z.Z.load();
                }
            }
        },

        // view
        V: {

            // render data to the html template
            render: function (data, leaveKeys, dontAppend) {
                var self = this;

                // check if a template exists
                if (!self._tp) {
                    return;
                }

                self.html = '';
                self.data = data = data || [{}];

                // render data
                for (var i = 0; i < data.length; ++i) {

                    // change data before it gets rendered to the html
                    if (typeof self.on.data === 'function') {
                        data[i] = self.on.data(data[i]) || data[i];
                    }

                    self.html += self._tp(data[i] || {}, leaveKeys, self._mi);
                }

                // change html before writing it to the dom
                if (typeof self.on.html === 'function') {
                    self.html = self.on.html(self.html) || self.html;
                }

                // write html to dom
                if (!dontAppend && self.dom) {
                    self.dom.innerHTML = self.html;

                    // append dom events
                    if (self.actions) {
                        observe.call(self, {actions: self.actions});
                    }
                }

                // change html before writing it to the dom
                if (typeof self.on.done === 'function') {
                    self.on.done(self);
                }

                return self;
            },

            // set a template function or a html snippet
            set: function (template, dom, scope) {
                var self = this;
                self._tp = typeof template === 'function' ? template : createTemplate(template);

                if (dom) {
                    self.dom = typeof dom === 'string' ? (scope || document).querySelector(dom) : dom;
                }
            }
        },

        // model
        M: {

            // send model request
            req: function (data, callback) {
                var self = this;

                // emit server event
                self._.emit('model_req>', null, {
                    m: self.model,
                    d: data
                }, function (err, data) {

                    if (err) {
                        return callback(err);
                    }

                    // callback or emit data
                    callback ? callback(null, data) : self._.emit('m_' + self.name + '_data');
                });
            }
        }
    };

    // --------------------------------------------------------------- FACTORIES

    var factories = {

        // instance
        I: function (inst, config, callback) {

            // extend module instance
            inst.Z._ = inst;
            inst.Z.name = name;
            inst.Z.config = config.config;
            inst.Z.module = config.module;

            // attach send handler to instance configured client events
            if (config.send) {
                for (var e = 0; e < config.send.length; ++e) {
                    inst.Z.on('^' + config.send[e] + '$', send(config.send[e]));
                }

                // attach public instance loading event
                inst.Z.on('^inst>$', send('inst>'));
            }

            // load scripts and init module
            if (config.scripts && config.scripts.length > 0) {
                return loadJS(config.module, config.scripts, callback);
            }

            callback();
        },

        // view
        V: function (view, config, callback) {
            var self = this;

            loadCss(config.css);

            // extend view instance
            view._ = self;
            view.on = {};
            view.config = config.config || {};

            // append custom handlers
            if (config.on) {
                for (var event in config.on) {
                    view.on[event] = self.Z.path(config.on[event]);
                }
            }

            // set html template
            if (config.html) {
                view.set(config.html, config.to, config['in']);
            }

            // update view on model data
            if (config.L) {
                for (var i = 0; i < config.L.length; ++i) {
                    if (config.L[i].type === 'M') {
                        self.on('m_' + config.L[i].name + '_data', view.render);
                    }
                }
            }

            callback();
        },

        // model
        M: function (model, config, callback) {
            var self = this;

            mode.name = config.name;
            model.data = [{}];

            // save flat schema in models cache
            model.schema = self.Z.flat(config);

            callback();
        }
    };

    // ----------------------------------------------------------- CORE INSTANCE

    // create core module
    var coreInstance = classes.I.Z.clone(classes.I);
    coreInstance.Z._ = coreInstance;
    coreInstance.Z.name = 'Z';
    coreInstance.Z.ready = true;

    // setup 'inst>' as server event
    coreInstance.Z.on('inst>', send('inst>'));

    // core module methods
    coreInstance.wrap = function (path, module) {
        modules[path] = module;
        this.Z.emit(path);
    };

    // save core module on cache and export to global
    win.Z = cache.I.Z = coreInstance;

    // ------------------------------------------------ LOAD AND SET UP ELEMENTS

    // factory handler
    function factoryHandler (factory, clone, config, callback) {
        var self = this;
        var ready = 1;
        var count = 0;
        var handler = function (err, constructor) {

            count += 1;

            if (err) {
                return callback(err);
            }

            // init or callback when all elements are ready
            if (ready === count) {

                // call constructor when all sub elements are loaded
                if (constructor) {

                    clone.Z.on('ready', function (err) {

                        // start observing
                        if (config.O) {
                            observe.call(self, config.O);
                        }

                        callback(err);

                    }, 1);

                    // call constructor
                    constructor.call(clone);

                } else {
                    callback(null, clone);
                }
            }
        };

        // load sub elements
        if (config.L) {

            // add sub elements to ready count
            ready += config.L.length;

            // load sub element in paralell
            for (var i = 0; i < config.L.length; ++i) {
                clone.Z.load(config.L[i].type, config.L[i].name, handler);
            }
        }

        // factory clone
        factory.call(self, clone, config, handler);
    }

    // set up observables
    function observe (config) {
        var self = this;
        var i, e;
        var elm;

        // listen to events
        if (config.events) {
            for (i = 0; i < config.events.length; ++i) {
                self.on(
                    config.events[i].re,
                    act.call(self, config.events[i].A),
                    config.events[i]['1']
                );
            }
        }

        // actions (dom)
        if (config.actions) {
            for (i = 0; i < config.actions.length; ++i) {
                elm = document.querySelectorAll(config.actions[i].selector);
                if (elm) {
                    for (e = 0; e < elm.length; ++e) {
                        elm.addEventListener(config.actions[i].name, act.call(self, config.actions[i].A));
                    }
                }
            }
        }
    }

    // act (handlers)
    function act (config) {
        var self = this;
        var method;

        // get methods references
        if (config.call) {
            for (i = 0; i < config.call.length; ++i) {
                config.call[i] = {
                    fn: self.path(config.call[i].path),
                    args: config.call[i].args
                };
            }
        }

        return function (callback) {
            var i;
            var emit;

            // observe
            if (config.O) {
                observe.call(self, config.O);
            }

            // emit
            if (config.emit) {
                for (i = 0; i < config.emit.length; ++i) {

                    emit = config.emit[i];
                    emit.type = emit.type || 'emit';

                    if (emit.to) {
                        return self.push(emit.name, emit.to, emit.args);
                    }

                    self[type](emit.name, emit.args);
                }
            }

            // call
            if (method) {
                for (i = 0; i < config.call.length; ++i) {
                    config.call[i].fn.apply(self ,config.call[i].args);
                }
            }

            // load
            if (config.L) {
                for (i = 0; config.L.length; ++i) {
                    self.load(config.L[i].type, config.L.name);
                }
            }
        };
    }

    // ---------------------------------------------------------- VIEW FUNCTIONS

    // create a template function
    function createTemplate (html) {

        // create template
        // credentials: http://github.com/mood/riotjs/lib/render.js
        html = html.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/'/g, "\\'");
        html = new Function('d','k','i',
            "var v;return '" + html.replace(/\{\s*([\w\.]+)\s*\}/g, "'+("+
            "(v='$1'.indexOf('.')>0?i.path('$1',d):d['$1'])?(v+'')" +
            ".replace(/&/g,'&amp;')" +
            ".replace(/'/g,'&quot;')" +
            ".replace(/</g,'&lt;')" +
            ".replace(/>/g,'&gt;')" +
            ":v===0?0:(k?'{$1}':''))+'") + "'"
        );

        return html;
    }

    // load css files
    function loadCss (urls) {
        if (urls) {
            for (var i in urls) {
                // path are always absolute
                urls[i] = urls[i][0] !== '/' ? '/' + urls[i] : urls[i];

                if (!css[urls[i]]) {
                    css[urls[i]] = 1;

                    var link = document.createElement('link');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', urls[i]);
                    document.head.appendChild(link);
                }
            }
        }
    }

    // ------------------------------------------------------ OBSERVER FUNCTIONS

    // remove listeners
    function remove (events, rmObject) {

        if (rmObject.length) {
            for (i = 0; i < rmObject.length; ++i) {

                // remove handler
                events[rmObject[i][0]].splice(rmObject[i][0], 1);

                // remove event
                if (events[rmObject[i][0]].length === 0) {
                    delete events[rmObject[i][0]];
                }
            }
        }
    }

    // ----------------------------------------------------------- SCRIPT LOADER

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

    // create CommonJS modules in order of the dependencies-
    function createCommonJsModulesInOrder (moduleSources, callback) {

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
        callback(modules[moduleSources[0]] ? modules[moduleSources[0]].exports : null);
    }

    // load handler for external dependencies
    function extDepLoaded (src) {
        return function () {
            modules[src] = 2;
            cache.I.Z.emit(src);
        };
    }

    // load scripts (script tag)
    function loadJS (moduleName, moduleSources, callback) {

        var length = moduleSources.length;
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(moduleSources, callback);
            }
        };

        for (var i = length - 1, source, url; i >= 0; --i) {

            source = moduleSources[i];

            // ingore loading for unified code
            if (source[0] === '#') {
                // remove the control sign
                moduleSources[i] = source.indexOf('./') === 1 ? source.substr(3) : source.substr(1);
                --length;
                continue;
            }

            // load module files
            if (source.indexOf('./') === 0) {
                moduleSources[i] = source = moduleName + source.substr(2);
            }

            // when script is loaded check if it's evaluated
            cache.I.Z.on(source, modDepLoaded, 1);

            // emit source event for already loaded scripts
            if (modules[source] && modules[source] !== 1) {
                cache.I.Z.emit(source);

            // load module scripts
            } else if (!modules[source]) {
                modules[source] = 1;
                var node = doc.createElement('script');

                url = '/@/M/mod/' + source;

                // handle external scripts onload event
                if (source[0] === '/' || source.indexOf('://') > 0) {
                    node.onload = extDepLoaded(source);
                    url = source;
                }

                node.src = url;
                doc.head.appendChild(node);
            }
        }
    }

    // ------------------------------------------------------ WEBSOCKET HANDLERS

    // load start instance when websocket is connected
    webSocket.onopen = function () {
        Z.Z.load();
    };

    // show reload message after socket closed
    webSocket.onclose = function () {
        setTimeout(function () {
            //win.location.reload();
        }, 500);
        //if(confirm('Connection is lost. Click "OK" to reload')) {}
    };

    // -------------------------------------------------------- MESSAGE HANDLERS

    // parse websocket messages: ['instanceName:event:cbId','err','data']
    webSocket.onmessage = function (message) {

        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        var err = message[1];
        var data = message[2];

        message = message[0].split(':');

        var instance = message[0];
        var event = message[1];
        var cbId = message[2];

        if (instance && event && cache.I[instance]) {

            // call callback
            if (wsCache[cbId]) {
                wsCache[cbId].call(cache.I[instance], err, data);
                delete wsCache[cbId];
            }

            // emit event
            cache.I[instance].Z.emit(event, err, data);
        }
    };

    // create websocket message: ['instanceName:event:cbId','err','data']
    function send (event) {
        return function (err, data, callback) {

            var message = [this.Z.name + ':' + event, err || 0];
            var cbId;

            if (data) {
                message[2] = data;
            }

            if (callback) {
                cbId = this.Z.uid(5);
                message[0] += ':' + cbId;
                wsCache[cbId] = callback;
            }

            try {
                message = JSON.stringify(message);
            } catch (parseError) {
                if (callback) {
                    callback(parseError);
                }
                return;
            }

            webSocket.send(message);
        };
    }

})({}, {I:{}, V:{}, M:{}}, {}, {}, 'function', this, document);
