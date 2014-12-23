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

                // dynamic urls
                if (url && url.indexOf('/*') > -1) {
                    // get path, search and hash
                    var pathname = path.split('/');
                    var dyn_url = url.split('/');

                    for (var i = 0; i < dyn_url.length; ++i) {
                        if (dyn_url[i] === '*' && pathname[i]) {
                            dyn_url[i] = pathname[i];
                        }
                    }

                    url = dyn_url.join('/');
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
                var args = arguments.length > 1 ? self._toArray(arguments).slice(1) : [];

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
                    name = '_';
                }

                var self = this;
                var factory = factories[type];
                var clone;
                var cacheKey = name;
                var typeName = type === 'I' ? 'inst' : type === 'V' ? 'view' : type === 'M' ? 'model' : null;

                // ensure callback
                callback = callback || function () {};

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
                self.emit(type + '>', name, function loadConfigHandler (err, config) {

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

                    // create html
                    self.html += self.tpl(rData || data[i], default_escape_fn, dontEscape || self.dontEscape, leaveKeys || self.leaveKeys);
                }

                // change html before writing it to the dom
                if (typeof self.on.html === 'function') {
                    self.html = self.on.html(self.html) || self.html;
                }

                if (typeof self.dom === 'string') {
                    self.dom = (self.scope || doc).querySelector(self.dom);
                }

                // render html
                if (!dontAppend && self.dom) {
                    self.dom.innerHTML = self.html;
                }

                // append dom events
                if (self.flow) {
                    flow.call(self._, self.flow, true);
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
                self._.emit('Q>', {
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
            inst._renderOrder = [];

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
            view.flow = config.flow;

            // add infos for nested views
            view.nested = config.nested;

            // save view in instance
            self.view[config.name] = view;

            // save render order on instance
            self._renderOrder[index] = config.name;
        },

        // model
        // TODO add an option for live updates (push)
        // TODO update a connected view on live update
        M: function (model, config) {
            var self = this;

            model._ = self;
            model.data = [{}];

            // save flat schema in models cache
            model.schema = self._flat(config);

            // save model in instance
            self.model[config.name] = model;
        }
    };

    // ---------------------------------------------------------- VIEW CONSTANTS

    var template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"};
    var render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

    // --------------------------------------------------------- EVENT CONSTANTS

    var find_tmpl = /{([\w\.]+)}/g;
    var find_braces = /\{|\}/g;
    var find_index = /\.\$(?=\.|$)/g;

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

    // setup and open a websocket
    coreInstance.socket = setupWebSocket;
    coreInstance.socket();

    // load start instance when websocket is connected
    coreInstance._ws.onopen = function () {
        Z._load();
    };

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
                flow.call(init[1], init[2], false, true);
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
                if (config.flow) {
                    inits.push([null, self, config.flow]);
                }

                // pass constructors to parent
                if (sub) {
                    callback(err, null, inits);

                // init constructors
                } else if (inits.length) {
                    initConstructors(err, inits);

                // finish without constructors
                } else {
                    callback(err, clone);
                }
            }
        };

        // factory clone
        factory && factory.call(self, clone, config, viewIndex - 1);

        // skip resources
        if (!config.load && !config.scripts) {
            return loaderHandler();
        }

        // load elements
        if (config.load) {

            // update the view index
            self._vi = self._vi || 0;

            // add the number of sub elements to count
            elements += config.load.length;

            // load sub elements
            for (var i = 0, type; i < config.load.length; ++i) {
                type = config.load[i][0];

                // increment view render order index
                if (type == 'V') {
                    ++self._vi;
                }

                // call loader
                self._load(type, config.load[i][1], loaderHandler, config.module ? true : false, self._vi);
            }
        }

        // load scripts
        if (config.scripts) {
            loadJS(config.module, config.main || 0, config.scripts, loaderHandler);
        }
    }

    // set up event flow
    function flow (config, onlyDom, onlyObs) {
        var self = this;
        var i, e;
        var elms;
        var flow;

        for (i = 0; i < config.length; ++i) {
            flow = config[i];

            // handle dom event
            if (flow.selector && !onlyObs) {

                elms = doc.querySelectorAll(flow.selector);
                if (elms) {
                    for (e = 0; e < elms.length; ++e) {
                        elms[e].addEventListener(
                            flow['in'],
                            createHandler.call(
                                self,
                                flow.out,
                                true,
                                e,
                                elms,
                                flow.dontPrevent
                            )
                        );
                    }
                }

            // handle osberver event
            } else if (!onlyDom) {

                self.on(
                    flow['in'],
                    createHandler.call(self, flow.out),
                    flow['1'],
                    flow.noRoute
                );
            }
        }
    }

    // act (handlers)
    function createHandler (outConfig, dom, elmIndex, elms, dontPrevent) {
        var self = this;
        var callback = function () {};
        var i, call;

        // handle call stdOut and stdErr configuration
        for (var i = 0; i < outConfig.length; ++i) {
            if ((call = outConfig[i].call) && call[1]) {

                var errorHandler;
                var handler = createHandler.call(self, call[1], dom, elmIndex, elms, dontPrevent);

                if (call[2]) {
                    errorHandler = createHandler.call(self, call[2], dom, elmIndex, elms, dontPrevent);
                }

                // create callback handler
                if (handler || errorHandler) {
                    callback = function (err, data) {

                        if (err) {
                            event.error = err;
                            (errorHandler || handler).call(self, event, data);

                        } else if (handler) {
                            handler.call(self, event, data);
                        }
                    }
                }
            }
        }

        return function handler (event, _data) {
            var config;
            var key;
            var to;
            var _path;
            var _domElm;
            var i;
            var loadElms = [];
            var path;
            var data;

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

            // add pathname to data object
            event._path = win_location.pathname.substr(1).split('/');

            // parse and append url search to data
            if (win_location.search && !event._search) {
                event._search = searchToJSON();
            }

            // append url hash to data
            if (win_location.hash && !event._hash) {
                event._hash = win_location.hash.substr(1);
            }

            for (i = 0; i < outConfig.length; ++i) {

                config = outConfig[i];
                to = null;

                // check if target instance exists and set new scope
                if (config.to && !(to = cache.I[config.to])) {
                    continue;
                }

                // update scope
                var eSelf = to || self;

                // copy the static data or create a new data object
                data = config.data ? JSON.parse(JSON.stringify(config.data)) : {};

                // merge argument data to data object
                if (_data) {
                    for (key in _data) {
                        data[key] = _data[key];
                    }
                }

                // add dynamic data to the data object
                if (config.set) {

                    // add data to the data object
                    for (key in config.set) {

                        // parse path
                        path = parsePath.call(self, config.set[key], event);

                        // get an attribute value from a dom element or the element itself
                        if (path[0] === '$') {
                            _domElm = path.substr(1).split(':');
                            _domElm[0] = doc.querySelector(_domElm[0]);

                            // get an attribute
                            if (_domElm[1]) {
                                _domElm[1] = _domElm[0][_domElm[1]];
                            }

                            // add dom attribute value or the element itself
                            data[key] = _domElm[1] === undefined ? _domElm[0] : _domElm[1];

                        // extend data with keys from an other object
                        } else {

                            // replace positional operator with index number
                            path = path.replace(find_index, '.' + (elmIndex || 0));

                            // update data object
                            data[key] = self._path(path, event, true) || self._path(path, data, true) || self._path(path);
                        }
                    }

                    // create deep object out of flat keys
                    data = self._deep(data);
                }

                // collect elements to load
                if (config.load) {
                    loadElms.push(config.load);
                }

                // adapt to method
                if (config.route) {
                    eSelf.route(parsePath.call(self, config.route, data), data);
                }

                // emit an event
                if (config.emit) {
                    eSelf.emit.call(eSelf, config.emit, event, data);
                }

                // call a method
                if (config.call) {

                    // find call method when the event handler is called
                    if (typeof config.call[0] === 'string' && typeof (config.call[0] = eSelf._path(config.call[0])) !== fn) {
                        return console.error(self._name + ':', 'Cannot call', eSelf._name + ':' + config.call[0]);
                    }

                    // call method
                    config.call[0].call(eSelf, event, data, callback);
                }
            }

            // load elements in parallel
            loadElms[0] && loader.call(self, null, self, {load: loadElms}, function () {});
        };
    }

    // replace values with paths
    function parsePath (path, event) {
        var self = this;
        var match = path.match(find_tmpl);

        // replace route with data
        if (match) {
            for (var i = 0, value; i < match.length; ++i) {

                // get value from object
                value = self._path(match[i].replace(find_braces, ''), event);

                // replace value in route
                if (typeof value !== 'undefined') {
                    path = path.replace(match[i], value);
                }
            }
        }

        return path;
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
        str = str == null ? (leaveKeys ? key : '') : str;

        // render a nested view
        if (typeof str === 'object' && this.nested && this._.view[this.nested[key]]) {
            var view = this._.view[this.nested[key]];

            // render nested view and don't append to the dom
            view.render(str, dont_escape_html, leaveKeys, true);

            // get html of rendered view
            str = view.html;

            // don't escape html chars
            dont_escape_html = true;

        // make sure str is a string
        } else {
            str += '';
        }

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
            }).replace(/{\s*([\w\.]+)\s*}/g, "' + f.call(this,_,'$1',e,k) + '") + "'"
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

    // CommonJS require
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
            }

            name += name.slice(-3) !== '.js' ? '.js' : '';
            if (modules[name]) {
                return modules[name].exports;
            }
        };
    }

    // create CommonJS modules in order of the dependencies-
    function createCommonJsModulesInOrder (main, moduleSources, callback) {

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
        callback(null, modules[moduleSources[main]] ? modules[moduleSources[main]].exports : null);
    }

    // load handler for external dependencies
    function extDepLoaded (src) {
        return function () {
            modules[src] = 2;
            cache.I.Z.emit(src);
        };
    }

    // load scripts (script tag)
    function loadJS (moduleName, mainSource, moduleSources, callback) {

        var length = moduleSources.length;
        var modDepLoaded = function () {
            if (--length === 0) {
                createCommonJsModulesInOrder(mainSource, moduleSources, callback);
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
                if ((ext = source.indexOf('//') > -1)) {
                    node.onload = extDepLoaded(source)
                }

                // create module script url
                url = source[0] === '/' ? source : '/@/Z/M/' + source;

                // add fingerprint to the url
                node.src = ext ? url : url.replace(/\.js$/, '.' + fingerprint + '.js');
                doc.head.appendChild(node);
            }
        }
    }

    // ------------------------------------------------------ WEBSOCKET HANDLERS

    function setupWebSocket (webSocket) {

        webSocket = new WebSocket('ws://' + win_location.host + '/');

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

        // attach socket to Z instance
        this._ws = webSocket;
    }

    // create websocket message: ['instanceName:event:cbId', 'data']
    function send (event) {
        return function (data, callback) {

            var cbId = this._uid(3);
            var message = [this._name + ':' + event + ':' + cbId];

            wsCache[cbId] = callback;

            if (data) {
                message[1] = data;
            }

            try {
                message = JSON.stringify(message);
            } catch (parseError) {
                return callback(parseError);
            }

            Z._ws.send(message);
        };
    }

})({}, {I:{}, V:{}, M:{}}, {}, {}, 'function', this, document, this.location, {}, {});
