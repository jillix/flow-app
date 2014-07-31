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
                var self = this;

                // normalize pathname
                var pathname = location.pathname;
                pathname += pathname[pathname.length - 1] === '/' ? '' : '/';

                // normalize url
                url = url || pathname;
                url += url[url.length - 1] === '/' ? '' : '/';

                // dynamic urls
                if (url.indexOf('/*/') > -1) {
                    var path = pathname.split('/');
                    var dyn_url = url.split('/');

                    for (var i = 0; i < dyn_url.length; ++i) {
                        if (dyn_url[i] === '*' && path[i]) {
                            dyn_url[i] = path[i];
                        }
                    }

                    url = dyn_url.join('/');
                }

                // // push state only when url changes
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

                    // emit only when a instance is ready and the url changed.
                    if (!cache.I[instance]._ready || cache.I[instance]._url === url) {
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
                // index for events that must be removed
                var rm = [];

                // handle emit
                if (typeof event === 'object') {

                    // get new scope
                    if (event.to) {
                        self = cache.I[event.to];
                        if (!self) {
                            return;
                        }
                    }

                    // TODO handle the "emit on all instances" case
                    all = event.all;

                    // set event as event name
                    event = event.event;
                }

                var events = self._events;

                // slice first argument
                var args = self._toArray(arguments).slice(1);

                for (var _event in events) {

                    // compare event or test regex
                    if (_event === event || events[_event].re.test(event)) {

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
                        if (args[0] && args[0]._rt && !events[_event].nr) {
                            break;
                        }
                    }
                }

                // remove unused events
                remove(events, rm);
            },

            // listen to events
            on: function listen (event, handler, once, noRoute) {
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
                        events[event].nr = noRoute;
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
                var typeName = type === 'I' ? 'inst' : type === 'V' ? 'view' : type === 'M' ? 'model' : null;

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

                    // save element on instance
                    self[typeName] = self[typeName] || {};
                    self[typeName][name] = cache[type][cacheKey];

                    return callback();
                }

                // create clone
                clone = cache[type][cacheKey] = self._clone(classes[type]);

                // add name to clone
                clone._name = name;

                // get factor config from server
                self.emit(type + '>', null, name, function loadConfigHandler (err, config) {

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

                if (!path) {
                    return;
                }

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

                    self.html += self._tp(data[i] || {}, leaveKeys, self._);
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
                    if (self.O) {
                        observe.call(self._, self.O);
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
                self._.emit('m>', null, {
                    m: self._name,
                    d: data
                }, function (err, data) {

                    if (err) {
                        return callback(err);
                    }

                    // save current data
                    self.data = data;

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

            // add instance reference
            view._ = self;

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
            /*if (config.L) {
                for (var i = 0; i < config.L.length; ++i) {
                    if (config.L[i].type === 'M') {
                        self.on('m_' + config.L[i].name + '_data', view.render);
                    }
                }
            }*/

            // save observer action config for later use after rendering
            if (config.O && config.O.actions) {
                view.O = {actions: config.O.actions};
            }

            // save view in instance
            self.view = self.view || {};
            self.view[config.name] = view;
        },

        // model
        // TODO add an option for live updates (push)
        M: function (model, config) {
            var self = this;

            model._ = self;
            model.data = [{}];
            model.config = config.config || {};

            // save flat schema in models cache
            model.schema = self._flat(config);

            // save model in instance
            self.model = self.model || {};
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
    coreInstance.on('I>', send('I>'));
    coreInstance.on('V>', send('V>'));
    coreInstance.on('M>', send('M>'));

    // core module methods
    coreInstance.wrap = function (path, module) {
        modules[path] = module;
        this.emit(path);
    };

    // save core module on cache and export to global
    win.Z = cache.I.Z = coreInstance;

    // ------------------------------------------------ LOAD AND SET UP ELEMENTS

    // init constructors from top to bottom
    function initConstructors (err, constructors) {

        var length = constructors.length;
        var count = 0;
        var initConstructorsHandler = function (init) {

            if (!init) {
                return;
            }

            // set up ovserve configs from views and modules
            if (!init[0]) {
                observe.call(init[1], init[2]);
                return initConstructorsHandler(constructors[++count]);
            }

            // call constructor
            init[0].call(init[1], init[2] || {}, function instanceConstructorCallback (err) {

                // mark element as ready
                init[1]._ready = true;

                initConstructorsHandler(constructors[++count]);

                // emit empty route
                init[1].route();
            });
        };

        initConstructorsHandler(constructors[count]);
    }

    // load resources in parallel
    // TODO handle loading errors
    function loader (factory, clone, config, callback, sub) {
        var self = this;
        var elements = 1;
        var count = 0;
        var inits = [];
        var loaderHandler = function (err, constructor, _inits) {

            // catch constructor
            if (constructor) {
                inits.unshift([constructor, clone, config.config]);
            }

            inits = inits.concat(_inits || []);

            // init or callback when all elements are ready
            if (elements === ++count) {

                // add observe events config to initialization
                if (config.O) {

                    // add complete observer to all non html views
                    if (!config.to) {
                        inits.push([null, self, config.O]);

                    // if its a view with html only observe the events
                    // the actions are observed after the view is rendered
                    } else if (config.O.events) {
                        inits.push([null, self, {events: config.O.events}]);
                    }
                }

                // pass constructors to parent
                if (sub) {
                    callback(err, null, inits);

                // init constructors
                } else if (inits.length) {
                    initConstructors(err, inits);
                } else {
                    callback(err, clone);
                }

            }
        };

        // factory clone
        factory.call(self, clone, config);
        clone._base = win.location.pathname;

        // load resources
        if (config.L) {

            // load sub elements
            if (config.L.elms) {

                // add sub elements to count
                elements += config.L.elms.length;

                // load sub elements
                for (var i = 0; i < config.L.elms.length; ++i) {
                    self._load(config.L.elms[i].type, config.L.elms[i].name, loaderHandler, true);
                }
            }

            // load scripts
            if (config.L.scripts) {
                loadJS(config.module, config.L.scripts, loaderHandler);
            } else {
                loaderHandler();
            }

        // or skip to handler
        } else {
            loaderHandler();
        }
    }

    // set up observables
    function observe (config) {
        var self = this;
        var i, e;
        var elm;
        var event;

        // listen to events
        if (config.events) {
            for (i = 0; i < config.events.length; ++i) {
                event = config.events[i];
                self.on(
                    event.re,
                    act.call(self, event.A),
                    event['1'],
                    event.noRoute
                );
            }
        }

        // actions (dom)
        if (config.actions) {
            for (i = 0; i < config.actions.length; ++i) {
                elm = document.querySelectorAll(config.actions[i].selector);
                if (elm) {
                    for (e = 0; e < elm.length; ++e) {
                        elm[e].addEventListener(
                            config.actions[i].name,
                            act.call(self,
                                config.actions[i].A,
                                true,
                                e,
                                elm,
                                config.actions[i].dontPrevent
                            )
                        );
                    }
                }
            }
        }
    }

    // act (handlers)
    function act (config, dom, elmIndex, elms, dontPrevent) {
        var self = this;
        var method;
        var re = /^{.+}$/;

        // get methods references
        if (config.call) {
            for (i = 0; i < config.call.length; ++i) {
                if (config.call[i].path) {
                    config.call[i] = {
                        fn: self._path(config.call[i].path),
                        args: config.call[i].args || [],
                        item: config.call[i].item
                    };
                }
            }
        }

        return function actHandler () {
            var i;
            var emit;
            var item;
            var args = self._toArray(arguments) || [];

            // prevent dom default
            if (dom) {

                if (!dontPrevent) {
                    args[0].preventDefault();
                }

                // add found elements to event
                args[0].elms = elms;

                // add index of found elements
                args[0].index = elmIndex;
            }

            // observe
            if (config.O) {
                observe.call(self, config.O);
            }

            // emit
            if (config.emit) {
                for (i = 0; i < config.emit.length; ++i) {

                    emit = config.emit[i];

                    // add an item, as first arguments, to event args
                    if (emit.item) {
                        item = getActItem.call(self, re, emit.item, elmIndex, args);
                    }

                    // adapt to method
                    if (emit.route) {

                        var route;

                        // replace route with item data
                        if (item) {
                            var match = emit.route.match(/{([^}]+)}/g);
                            route = emit.route;

                            for (var m = 0, value; m < match.length; ++m) {

                                // get value from object
                                value = self._path(match[m].replace(/\{|\}/g, ''), item);

                                // replace value in route
                                route = route.replace(match[m], value);
                            }
                        }

                        self.route(route || emit.route);
                    } else {

                        // append arguments to static args
                        if (emit.args) {
                            args = emit.args.concat(args);
                        }

                        args.unshift(emit);

                        self.emit.apply(self, args);
                    }
                }
            }

            // call
            if (config.call) {
                for (i = 0; i < config.call.length; ++i) {

                    // append an item to args
                    if (config.call[i].item) {
                        getActItem.call(self, re, config.call[i].item, elmIndex, args);
                    }

                    config.call[i].fn.apply(self, args.concat(config.call[i].args));
                }
            }

            // load
            // TODO what about config.L.srcipts??
            if (config.L && config.L.elms) {
                for (i = 0; i < config.L.elms.length; ++i) {
                    self._load(config.L.elms[i].type, config.L.elms[i].name);
                }

                // remove load config after elements are loaded
                delete config.L;
            }
        };
    }

    function getActItem (re, item, index, args) {
        var self = this;
        var found;

        // create item from url pathname
        if (item[0] === '/') {

            // TOOD normalize pathname
            var url_path = win.location.pathname.split('/').slice(1, -1);
            var map_path = item.split('/').slice(1, -1);

            // create empty item
            item = {};

            // create item from url pathname
            for (var p = 0, key; p < map_path.length; ++p) {
                key = map_path[p];

                if (re.test(key) && url_path[p]) {
                    key = key.replace(/\{|\}/g, '');
                    item[key] = url_path[p];

                    found = true;
                }
            }

        // replace positional operator with index number and find item
        } else if (typeof (item = self._path(item.replace(/\.\$(?=\.|$)/g, '.' + (index || 0)))) !== 'undefined'){
            found = true;
        }

        if (found) {

            // attach item to args
            args[0].elms || args[0]._rt ? args.push(item) : args.unshift(item);

            return item;
        }
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

                url = '/@/Z/M/' + source;

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
        }, 1000);
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
