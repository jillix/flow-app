(function(modules, cache, wsCache, css, fn, win, doc, win_location, cur_location, prev_location) {

    // check browser features and route to a "update your browser site"
    if (!win.WebSocket || !win.history) {
        win.location = 'http://browsehappy.com/';
        return;
    }

    // ---------------------------------------------------------------- POPSTATE

    // emit url event on popstate event
    win.addEventListener('popstate', function () {
        cache.I.Z.route('', {}, true);
    }, false);

    // --------------------------------------------------------------- WEBSOCKET

    // create websocket
    var webSocket = new WebSocket('ws://' + win_location.host + '/');

    // ----------------------------------------------------------------- CLASSES

    var classes = {

        // instance
        I: {

            // route to url
            route: function (url, data, fromPopstate) {

                var self = this;
                var path = win_location.pathname;
                var current = win_location.href.split(/^(.*:)\/\/([a-z\-.]+)(:[0-9]+)?(.*)$/)[4];

                data = data || {};

                if (url) {

                    // append hash to query only route
                    if (url[0] === '?') {
                        url = path + url + (win_location.hash || '#');
                    }

                    // prepend query to hash only route
                    if (url[0] === '#') {
                        url = path + (win_location.search || '?') + url;
                    }

                    // get path, search and hash
                    url = url.split(/\?|#/);

                    // dynamic urls
                    if (url[0].indexOf('/*') > -1) {
                        var pathname = path.split('/');
                        var dyn_url = url[0].split('/');

                        for (var i = 0; i < dyn_url.length; ++i) {
                            if (dyn_url[i] === '*' && pathname[i]) {
                                dyn_url[i] = pathname[i];
                            }
                        }

                        url[0] = dyn_url.join('/');
                    }

                    // create url string
                    url = url[0] + (url[1] ? '?' + url[1] : '') + (url[2] ? '#' + url[2] : '');
                }

                // emit current url if url is false
                url = url || current;

                // push state only when url changes
                if (fromPopstate || (url !== current)) {

                    // update previous location
                    prev_location = JSON.parse(JSON.stringify(cur_location));
                }

                // push url to browser history
                if (url !== current) {
                    history.pushState(0, 0, url);
                }

                // update current location
                cur_location = {
                    url: url,
                    path: win_location.pathname,
                    hash: win_location.hash,
                    search: win_location.search
                };

                // create state event object
                var stateEvent = {
                    pop: fromPopstate,
                    ori: self._name,
                    prev: prev_location,
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
                    cache.I[instance].emit.call(cache.I[instance], url, stateEvent, data);

                    // emit general route event
                    cache.I[instance].emit.call(cache.I[instance], 'route', stateEvent, data);
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
            _load: function (type, name, callback, sub, viewIndex) {

                // get instance name from host
                if (!type) {
                    type = 'I';
                    name = win_location.hostname.replace(/\./g, '_');
                }

                var self = this;
                var factory = factories[type];
                var clone;
                var cacheKey = name;
                var typeName = type === 'I' ? 'inst' : type === 'V' ? 'view' : type === 'M' ? 'model' : null;

                // ensure callback
                callback = callback || function () {};

                // manual config
                if (typeof name === 'object') {
                    // TODO how to set the elements name?
                    return loader.call(self, factory, self._clone(classes[type]), name, callback, sub, viewIndex);
                }

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

                        if (config.name) {

                            // update instance name
                            clone._name = config.name;

                            // also save instance under the original name in cache
                            cache[type][config.name] = clone;
                        }

                        self = clone;
                    }

                    // call factory
                    loader.call(self, factory, clone, config, callback, sub, viewIndex);
                });
            },

            // clone object
            _clone: function (object) {
                var O = function() {};
                O.prototype = object || {};
                return new O();
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

            // flat objects
            _flat: function (object) {
                var output = {};
                var value;
                var newKey;

                // recusrive handler
                function step(obj, prev) {
                    for (var key in obj) {
                        value = obj[key];
                        newKey = prev + key;

                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {

                            if (Object.keys(value).length) {
                                step(value, newKey + '.');
                                continue;
                            }
                        }

                        output[newKey] = value;
                    }
                }

                // start recursive loop
                step(object, '');

                return output;
            },

            // create a deep object
            _deep: function (object) {
                var result = {};
                var parentObj = result;
                var key;
                var subkeys;
                var subkey;
                var last;
                var keys = Object.keys(object);

                for (var i = 0; i < keys.length; ++i) {

                    key = keys[i];
                    subkeys = key.split('.');
                    last = subkeys.pop();

                    for (var ii = 0; ii < subkeys.length; ++ii) {
                        subkey = subkeys[ii];
                        parentObj[subkey] = typeof parentObj[subkey] === 'undefined' ? {} : parentObj[subkey];
                        parentObj = parentObj[subkey];
                    }

                    parentObj[last] = object[key];
                    parentObj = result;
                }

                return result;
            },

            // convert object to arrays
            _toArray: function (object) {
                return Array.prototype.slice.call(object);
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
            render: function (data, dontEscape, leaveKeys, dontAppend) {
                var self = this;
                var escape_fn;

                // check if a template exists
                if (!self.tpl) {
                    return;
                }

                self.html = '';
                self.data = data = data || [{}];

                // render data
                for (var i = 0, rData; i < data.length; ++i) {

                    // change data before it gets rendered to the html
                    if (typeof self.on.data === 'function') {
                        rData = self.on.data.call(self, data[i]) || data[i];
                    }

                    // render
                    self.html += self.tpl(rData || data[i], default_escape_fn, dontEscape || self.dontEscape, leaveKeys || self.leaveKeys);
                }

                // change html before writing it to the dom
                if (typeof self.on.html === 'function') {
                    self.html = self.on.html(self.html) || self.html;
                }

                if (typeof self.dom === 'string') {
                    self.dom = (self.scope || doc).querySelector(self.dom);
                }

                // append html to dom
                if (!dontAppend && self.dom) {
                    self.dom.innerHTML = self.html;
                }

                // append dom events
                if (self.O) {
                    observe.call(self._, self.O);
                }

                // change html before writing it to the dom
                if (typeof self.on.done === 'function') {
                    self.on.done(self);
                }
            },

            // set a template function or a html snippet
            set: function (html, dom, scope) {
                var self = this;

                // create template function
                self.tpl = createTemplate(html);
                self.scope = scope;
                self.dom = dom;
            }
        },

        // model
        M: {

            // send model request
            req: function (query, data, callback) {
                var self = this;

                // emit server event
                self._.emit('m>', null, {
                    m: self._name,
                    q: query,
                    d: data
                }, function (err, data) {

                    // save current data
                    self.data = data;

                    // callback
                    callback(err, data);
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

            // append view and model cache by default to every instance
            inst.view = {};
            inst.model = {};

            // attach send handler to instance configured client events
            if (config.send) {
                for (var e = 0; e < config.send.length; ++e) {
                    inst.on('^' + config.send[e] + '$', send(config.send[e]));
                }
            }
        },

        // view
        V: function (view, config, index) {
            var self = this;

            // load css files
            loadCss(config.css);

            // add instance reference
            view._ = self;

            // save config on view instance
            view.config = config.config || {};

            // dont escape html default config
            view.dontEscape = config.dontEscape;

            // leave keys in template default config
            view.leaveKeys = config.leaveKeys;

            // append custom handlers
            view.on = {};
            if (config.on) {
                for (var event in config.on) {
                    view.on[event] = self._path(config.on[event]);
                }
            }

            // set html template
            if (config.html) {
                view.set(config.html, config.to, config['in']);
            }

            // save observer action config for later use after rendering
            if (config.O && config.O.actions) {
                view.O = {actions: config.O.actions};
            }

            // save view in instance
            self.view[config.name] = view;

            // save render order on instance
            (self._renderOrder = self._renderOrder || [])[index] = config.name;
        },

        // model
        // TODO add an option for live updates (push)
        // TODO update a connected view on live update
        M: function (model, config) {
            var self = this;

            model._ = self;
            model.data = [{}];
            model.config = config.config || {};

            // save flat schema in models cache
            model.schema = self._flat(config);

            // save model in instance
            self.model[config.name] = model;
        }
    };

    // ---------------------------------------------------------- VIEW CONSTANTS

    var template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"};
    var render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

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

    // i18n
    coreInstance._i18n = null;

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
        var emitReady = [];
        var initConstructorsHandler = function (init) {

            if (!init) {

                // handle ready state
                for (var i = 0; i < emitReady.length; ++i) {

                    // mark element as ready
                    emitReady[i]._ready = true;
                    emitReady[i].emit('ready');
                }

                // emit empty route
                Z.route();

                return;
            }

            // set up ovserve configs from views and modules
            if (!init[0]) {
                observe.call(init[1], init[2]);
                return initConstructorsHandler(constructors[++count]);
            }

            // call constructor
            init[0].call(init[1], init[2] || {}, function instanceConstructorCallback (err) {

                // get instances to emit ready event after all resources are loaded
                emitReady.push(init[1]);

                // continue initialization
                initConstructorsHandler(constructors[++count]);
            });
        };

        initConstructorsHandler(constructors[count]);
    }

    // load resources in parallel
    // TODO handle loading errors
    function loader (factory, clone, config, callback, sub, viewIndex) {
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
        factory && factory.call(self, clone, config, viewIndex - 1);

        // load resources
        if (config.L) {

            // load sub elements
            if (config.L.elms) {

                // update the view index
                self._vi = self._vi || 0;

                // add sub elements to count
                elements += config.L.elms.length;

                // load sub elements
                for (var i = 0, elm; i < config.L.elms.length; ++i) {
                    elm = config.L.elms[i];

                    // increment view render order index
                    if (elm.type == 'V') {
                        ++self._vi;
                    }

                    self._load(elm.type, elm.name, loaderHandler, true, self._vi);
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
                elm = doc.querySelectorAll(config.actions[i].selector);
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
        var _self = this;
        var find_tmpl = /{([\w\.]+)}/g;
        var find_braces = /\{|\}/g;
        var find_index = /\.\$(?=\.|$)/g;

        return function actHandler (event, _data) {
            var self = _self;
            var i;

            // observe
            if (config.O) {
                observe.call(self, config.O);
            }

            // load elements
            if (config.L) {

                // load elements in parallel
                loader.call(self, null, self, {L: config.L}, function () {});

                // remove load config after elements are loaded
                delete config.L;
            }

            // create an event object
            event = event || {};
            event.ori = event.ori || self._name;

            // extend dom event object
            if (dom) {

                // dont prevent default browser actions
                if (!dontPrevent) {
                    event.preventDefault();
                }

                // add found elements to event
                event.elms = elms;

                // add index of found elements
                event.index = elmIndex;
            }

            // emit
            if (config.emit) {
                var emit;
                var key;
                var data;
                var to;
                var _path;

                for (i = 0; i < config.emit.length; ++i) {

                    emit = config.emit[i];
                    to = null;

                    // check if target instance exists and set new scope
                    if (emit.to && !(to = cache.I[emit.to])) {
                        continue;
                    }

                    // clone the data object from the arguments or create a new object
                    data = _data || {};

                    // copy the static data
                    if (emit.data) {
                        var copy = JSON.parse(JSON.stringify(emit.data));
                        for (key in copy) {
                            data[key] = copy[key];
                        }
                    }

                    // add pathname to data object
                    data._path = win_location.pathname.substr(1).split('/');

                    // parse and append url search to data
                    if (win_location.search) {
                        data._search = searchToJSON();
                    }

                    // append url hash to data
                    if (win_location.hash) {
                        data._hash = win_location.hash.substr(1);
                    }

                    // add dynamic data to the data object
                    if (emit.add) {

                        // add data to the data object
                        for (key in emit.add) {
                            _path = emit.add[key].replace(find_index, '.' + (elmIndex || 0));

                            // update data object
                            data[key] = self._path(_path) || self._path(_path, data, true);
                        }

                        // create deep object out of flat keys
                        data = self._deep(data);
                    }

                    // update scope
                    var eSelf = to || self;

                    // adapt to method
                    if (emit.route) {

                        var route = emit.route;
                        var match = emit.route.match(find_tmpl);

                        // replace route with data
                        if (match) {
                            for (var m = 0, value; m < match.length; ++m) {

                                // get value from object
                                value = self._path(match[m].replace(find_braces, ''), data);

                                // replace value in route
                                if (typeof value !== 'undefined') {
                                    route = route.replace(match[m], value);
                                }
                            }
                        }

                        eSelf.route(route, data);
                    }

                    if (emit.event) {
                        eSelf.emit.call(eSelf, emit, event, data);
                    }

                    if (emit.call) {

                        if (typeof emit.call === 'string') {
                            emit.call = eSelf._path(emit.call) || emit.call;
                        }

                        // call method
                        emit.call.call(eSelf, event, data);
                    }
                }
            }
        };
    }

    // parse url search string to JSON
    // Credentials: http://snipplr.com/view/70905/search-string-to-json/
    function searchToJSON(){
        var rep = {'?':'{"','=':'":"','&':'","'};
        var s = win_location.search.replace(/[\?\=\&]/g, function(r) {
            return rep[r];
        });
        return JSON.parse(s.length? s+'"}' : "{}");
    }

    // ---------------------------------------------------------- VIEW FUNCTIONS

    // escape html chars
    function default_escape_fn (data, key, dont_escape_html, leaveKeys) {

        // get the string value
        str = key.indexOf('.') > 0 ? Z._path(key, data) : data[key];

        // if str is null or undefined
        str = (str == null ? (leaveKeys ? key : '') : str) + '';

        // escape html chars
        if (!dont_escape_html) {
            return str.replace(/[&\"<>]/g, function(_char) {
                return render_escape[_char];
            });
        }

        return str;
    }

    // create a template function
    // heavily inspired by the https://github.com/muut/riotjs render method
    function createTemplate (tmpl) {
        return new Function("_", "f", "e", "k", "_=_||{};return '" +
            (tmpl || '').replace(/[\\\n\r']/g, function(_char) {
                return template_escape[_char];
            }).replace(/{\s*([\w\.]+)\s*}/g, "' + f(_,'$1',e,k) + '") + "'"
        );
    }

    // load css files
    function loadCss (urls) {
        if (urls) {
            for (var i in urls) {
                // path are always absolute
                urls[i] = urls[i][0] !== '/' ? '/' + urls[i] : urls[i];

                if (!css[urls[i]]) {
                    css[urls[i]] = 1;

                    var link = doc.createElement('link');
                    link.setAttribute('rel', 'stylesheet');
                    link.setAttribute('href', urls[i]);
                    doc.head.appendChild(link);
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

        for (var i = length - 1, source, url, fingerprint, ext; i >= 0; --i) {

            // split source
            source = moduleSources[i].split('?');

            // get fingerprint
            fingerprint = source[1];

            // remove fingerprint from source
            source = moduleSources[i] = source[0];

            // ingore loading for unified code
            if (source[0] === '#') {
                // remove the control sign
                moduleSources[i] = source.indexOf('./') === 1 ? source.substr(3) : source.substr(1);
                --length;
                continue;
            }

            // load module files
            if (source.indexOf('./') === 0) {
                moduleSources[i] = source = moduleName + source.substr( 2);
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

                // check if it's an external source
                ext = source.indexOf('//') > -1;

                // create module script url
                url = '/@/Z/M/' + source;

                // handle external scripts onload event
                if (source[0] === '/' || ext) {
                    node.onload = extDepLoaded(source);
                    url = source;
                }

                // add fingerprint to the url
                node.src = ext ? url : url.replace(/\.js$/, '.' + fingerprint + '.js');
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
            win_location.reload();
        }, 1000);
    };

    // -------------------------------------------------------- MESSAGE HANDLERS

    // parse websocket messages: ['instanceName:cbId','err','data']
    webSocket.onmessage = function (message) {

        // TODO broadcast messages have a different format
        // event, err, data

        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        var err = message[1];
        var data = message[2];

        message = message[0].split(':');

        var instance = message[0];
        var cbId = message[1];

        // show errors in console
        if (err) {
            console.error(instance + ':', err);
        }

        if (instance && cache.I[instance] && wsCache[cbId]) {

            // call callback
            wsCache[cbId].call(cache.I[instance], err, data);
            delete wsCache[cbId];
        }
    };

    // create websocket message: ['instanceName:event:cbId','err','data']
    function send (event) {
        return function (err, data, callback) {

            var cbId = this._uid(3);
            var message = [this._name + ':' + event + ':' + cbId, err || 0];

            wsCache[cbId] = callback;

            if (data) {
                message[2] = data;
            }

            try {
                message = JSON.stringify(message);
            } catch (parseError) {
                return callback(parseError);
            }

            webSocket.send(message);
        };
    }

})({}, {I:{}, V:{}, M:{}}, {}, {}, 'function', this, document, this.location, {}, {});
