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
                    ori: self._name,
                    _rt: true
                };

                // emit route events on all instances
                for (var instance in cache.I) {

                    // emit only when a instance is ready and the url changed. emit always on the origin instance.
                    if (!cache.I[instance]._ready || (cache.I[instance]._name !== stateEvent.ori && cache.I[instance]._url === url)) {
                        continue;
                    }

                    // set current url
                    cache.I[instance]._url = url;

                    // emit url route event
                    cache.I[instance].emit.call(cache.I[instance], url, stateEvent);

                    // emit general route event
                    cache.I[instance].emit.call(cache.I[instance], 'route', stateEvent);
                }
            },

            // emit event
            emit: function(event) {
                var self = this;
                var all;

                // handle emit
                if (typeof emit === 'object') {
                    event = emit.event;

                    // get new scope
                    if (emit.to) {
                        self = cache.I[emit.to];
                        if (!self) {
                            return;
                        }
                    }

                    // TODO handle the "emit on all instances" case
                    all = emit.all;
                }

                var events = self._events;

                // slice first argument
                var args = self._toArray(arguments).slice(1);

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
                                events[_event][i].apply(self, args);

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
                var events = self._events = self._events || {};

                // get handler from a path
                if (typeof handler !== fn) {
                    handler = self._path(handler);
                }

                if (typeof handler === fn) {

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
                var events = this._events;

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

            // load and set up elements
            // TODO what to do when element not found or access denied?
            _load: function (type, name, callback, sub) {

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
                    // TODO how to set the elements name?
                    return loader.call(self, factory, self._clone(classes[type]), name, callback, sub);
                }

                // create cache key
                cacheKey = name instanceof Array ? name.join() : name;

                // views are only unique with instance name
                if (type === 'V') {
                    cacheKey += self._name;
                }

                // get item from cache
                if (cache[type][cacheKey]) {
                    return callback(null, cache[type][cacheKey]);
                }

                // create clone
                clone = cache[type][cacheKey] = self._clone(classes[type]);

                // add name to clone
                clone._name = name;

                // get factor config from server
                self.emit(sendEvent + '>', null, name, function (err, config) {

                    if (err) {
                        return callback(err);
                    }

                    // set instance scope to new clone
                    if (type === 'I') {
                        self = clone;
                    }

                    // call factory
                    loader.call(self, factory, clone, config, callback, sub);
                });
            },

            // this._path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
            _path: function (path, scope, stop) {

                var o = path;
                path = path.split('.');
                scope = scope || this;

                // find keys in paths or return
                for (var i = 0; i < path.length; ++i) {
                    if (!(scope = scope[path[i]])) {
                        return stop ? null : this._path(o, win, true);
                    }
                }

                return scope;
            },

            // clone object
            _clone: function (object) {
                var O = function() {};
                O.prototype = object || {};
                return new O();
            },

            // convert object to arrays
            _toArray: function (object) {
                return Array.prototype.slice.call(object);
            },

            // flat objects
            _flat: function (object) {
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
            _uid: function (len) {
                len = len || 23;
                for (var i = 0, random = ''; i < len; ++i) {
                    random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
                }
                return random;
            },

            // reset and reload
            // TODO check memory leaks
            _reload: function (keepDom) {

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
                Z._load();
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

                if (typeof self.dom === 'string') {
                    self.dom = (self.scope || document).querySelector(self.dom);
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
                self.scope = scope;
                self.dom = dom;
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
                    callback ? callback(null, data) : self._.emit('m_' + self._name + '_data');
                });
            }
        }
    };

    // --------------------------------------------------------------- FACTORIES

    var factories = {

        // instance
        I: function (inst, config) {

            // extend module instance
            inst._module = config.module;

            // attach send handler to instance configured client events
            if (config.send) {
                for (var e = 0; e < config.send.length; ++e) {
                    inst.on('^' + config.send[e] + '$', send(config.send[e]));
                }
            }
        },

        // view
        V: function (view, config) {
            var self = this;

            // load css files
            loadCss(config.css);

            // save config on view instance
            view.config = config.config || {};

            // handlers
            view.on = {};
            // append custom handlers
            if (config.on) {
                for (var event in config.on) {
                    view.on[event] = self._path(config.on[event]);
                }
            }

            // set html template
            if (config.html) {
                view.set(config.html, config.to, config['in']);
            }

            // TODO update view on model data
            if (config.L) {
                for (var i = 0; i < config.L.length; ++i) {
                    if (config.L[i].type === 'M') {
                        self.on('m_' + config.L[i].name + '_data', view.render);
                    }
                }
            }

            // save view in instance
            self.view = self.view || {};
            self.view[config.name] = view;
        },

        // model
        // TODO add an option for live updates (push)
        M: function (model, config) {
            var self = this;

            model.data = [{}];
            model.config = config.config || {};

            // save flat schema in models cache
            model.schema = self._flat(config);

            // save model in instance
            self.model = self.view || {};
            self.model[config.name] = model;
        }
    };

    // ----------------------------------------------------------- CORE INSTANCE

    // create core module
    var coreInstance = classes.I._clone(classes.I);
    coreInstance._ = coreInstance;
    coreInstance._name = 'Z';
    coreInstance._ready = true;

    // setup default as server events
    coreInstance.on('inst>', send('inst>'));
    coreInstance.on('view>', send('view>'));
    coreInstance.on('model>', send('model>'));

    // core module methods
    coreInstance.wrap = function (path, module) {
        modules[path] = module;
        this.emit(path);
    };

    // save core module on cache and export to global
    win.Z = cache.I.Z = coreInstance;

    // ------------------------------------------------ LOAD AND SET UP ELEMENTS

    // init constructors from top to bottom
    function initConstructors (err, constructors, callback) {

        var length = constructors.length;
        var count = 0;
        var handler = function (init) {

            if (!init) {
                return callback(err);
            }

            // set up ovserve configs from views and modules
            if (!init[0]) {
                observe.call(init[1], init[2]);
                return handler(constructors[++count]);
            }

            // call constructor
            init[0].call(init[1], init[2] || {}, function (err) {

                // mark element as ready
                init[1]._ready = true;

                handler(constructors[++count]);

                // emit empty route
                init[1].route();
            });
        };

        handler(constructors[count]);
    }

    // load resources in parallel
    // TODO handle loading errors
    function loader (factory, clone, config, callback, sub) {
        var self = this;
        var elements = 1;
        var count = 0;
        var inits = [];
        var handler = function (err, constructor, _inits, _observe) {

            // catch constructor
            if (constructor) {
                inits.unshift([constructor, clone, config.config]);
            }

            inits = inits.concat(_inits || []);

            // init or callback when all elements are ready
            if (elements === ++count) {

                // add observe config to initialization
                if (config.O) {
                    inits.push([null, self, config.O]);
                }

                // pass constructors to parent
                if (sub) {
                    callback(err, null, inits);

                // init constructors
                } else {
                    initConstructors(err, inits, callback);
                }

            }
        };

        // factory clone
        factory.call(self, clone, config);

        // load resources
        if (config.L) {

            // load sub elements
            if (config.L.elms) {

                // add sub elements to count
                elements += config.L.elms.length;

                // load sub elements
                for (var i = 0; i < config.L.elms.length; ++i) {
                    self._load(config.L.elms[i].type, config.L.elms[i].name, handler, true);
                }
            }

            // load scripts
            if (config.L.scripts) {
                loadJS(config.module, config.L.scripts, handler);
            }
        // or skip to handler
        } else {
            handler();
        }
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
                        elm[e].addEventListener(config.actions[i].name, act.call(self, config.actions[i].A, true));
                    }
                }
            }
        }
    }

    // act (handlers)
    function act (config, dom) {
        var self = this;
        var method;

        // get methods references
        if (config.call) {
            for (i = 0; i < config.call.length; ++i) {
                if (config.call[i].path) {
                    config.call[i] = {
                        fn: self._path(config.call[i].path),
                        args: config.call[i].args || []
                    };
                }
            }
        }

        return function () {
            var i;
            var emit;
            var args = self._toArray(arguments) || [];

            // prevent dom default
            if (dom) {
                args[0].preventDefault();
            }

            // observe
            if (config.O) {
                observe.call(self, config.O);
            }

            // emit
            if (config.emit) {
                for (i = 0; i < config.emit.length; ++i) {

                    // TOOD adjust to new emit {event: '', to: '', all: ''}
                    emit = config.emit[i];
                    emit.type = emit.type || 'emit';

                    if (emit.to) {
                        return self.push(emit.name, emit.to, emit.args);
                    }

                    self[type](emit.name, emit.args);
                }
            }

            // call
            if (config.call) {
                for (i = 0; i < config.call.length; ++i) {
                    config.call[i].fn.apply(self, args.concat(config.call[i].args));
                }
            }

            // load
            // TODO what about config.L.srcipts??
            if (config.L && config.L.elms) {
                for (i = 0; i < config.L.elms.length; ++i) {
                    self._load(config.L.elms[i].type, config.L.elms[i].name);
                }
            }
        };
    }

    // ---------------------------------------------------------- VIEW FUNCTIONS

    // create a template function
    function createTemplate (html) {

        // TODO update with new riotjs renderer
        // create template
        // credentials: http://github.com/muut/riotjs/
        html = html.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/'/g, "\\'");
        html = new Function('d','k','i',
            "var v;return '" + html.replace(/\{\s*([\w\.]+)\s*\}/g, "'+("+
            "(v='$1'.indexOf('.')>0?i._path('$1',d):d['$1'])?(v+'')" +
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
        callback(null, modules[moduleSources[0]] ? modules[moduleSources[0]].exports : null);
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

                url = '/@/Z/mod/' + source;

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
        Z._load();
    };

    // show reload message after socket closed
    webSocket.onclose = function () {
        setTimeout(function () {
            win.location.reload();
        }, 3000);
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
            cache.I[instance].emit(event, err, data);
        }
    };

    // create websocket message: ['instanceName:event:cbId','err','data']
    function send (event) {
        return function (err, data, callback) {

            var message = [this._name + ':' + event, err || 0];
            var cbId;

            if (data) {
                message[2] = data;
            }

            if (callback) {
                cbId = this._uid(5);
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
