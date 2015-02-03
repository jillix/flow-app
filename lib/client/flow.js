var engine;
if (typeof E === 'undefined') {
    engine = global.engine;
} else {
    engine = E;
    global = window;
}

/**
 * Setup the event flow.
 *
 * @public
 * @param {object} The moule instnace.
 * @param {object} The event flow config.
 */
engine.flow = function (module_instance, config) {

    if (config) {

        for (var i = 0, flow; i < config.length; ++i) {
            flow = config[i];

            // listen to events
            module_instance.on(
                flow['in'],
                eventFlowHandler.call(module_instance, flow.out),
                flow['1'],
                flow.noRoute
            );
        }
    }
}


/**
 * Setup the user (DOM) event flow.
 *
 * @public
 * @param {object} The moule instnace.
 * @param {object} The DOM scope object.
 * @param {object} The data item.
 * @param {object} The event flow config.
 */
engine.userFlow = function (module_instance, domScope, data, config) {

    if (config = module_instance._config.userFlow) {

        var scope = [domScope];

        // set children as scope if there is more then one data item
        if (domScope && data.length > 1 && domScope.children) {
            scope = domScope.children;
        }

        for (var i = 0, flow; i < config.length; ++i) {
            flow = config[i];

            // overwrite scope with the document
            if (flow.scope === 'global') {
                scope = [document];
            }

            // overwrite scope with parent
            if (flow.scope === 'parent') {
                scope = [domScope];
            }

            for (var s = 0, elms; s < scope.length; ++s) {
                elms = flow.selector === '.' ? [scope[s]] : scope[s].querySelectorAll(flow.selector);
                if (elms) {
                    for (var e = 0; e < elms.length; ++e) {

                        elms[e].addEventListener(
                            flow['in'],
                            createHandler.call(
                                module_instance,
                                flow.out,
                                scope[s],
                                data[s],
                                elms,
                                flow.dontPrevent
                            )
                        );
                    }
                }
            }
        }
    }
}

// createHandler
function eventFlowHandler (outConfig) {
    var self = this;

    return function handler (event, _data) {
        var config;
        var key;
        var to;
        var _path;
        var i;
        var loadElms = [];
        var path;
        var data;

        // create an event object
        event = event || {};
        event.ori = event.ori || self._name;

        if (window) {
            // add pathname to data object
            event._path = window.location.pathname.substr(1).split('/');

            // parse and append url search to data
            if (window.location.search && !event._search) {
                event._search = searchToJSON();
            }

            // append url hash to data
            if (window.location.hash && !event._hash) {
                event._hash = window.location.hash.substr(1);
            }
        }

        for (var i = 0; i < outConfig.length; ++i) {

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

                    // get search value with a path: 1. events, 2. data, 3. instance, 4. window
                    data[key] = self._path(path, event, true) || self._path(path, data, true) || self._path(path);
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
                if (typeof config.call === 'string' && typeof (config.call = engine.path(config.call, eSelf)) !== 'function') {
                    return console.error(self._name + ':', 'Cannot call', eSelf._name + ':' + config.call);
                }

                // call method
                config.call.call(eSelf, event, data);
            }
        }

        // load elements in parallel
        //loadElms[0] && engine.module(self, null, self, {load: loadElms}, function () {});
    };
}

// createHandler
function userFlowHandler (outConfig, domScope, dataItem, elms, dontPrevent) {
    var self = this;

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

// ----------------------------------------------------------------------------- DOM SCOPE
        // extend dom event object
        if (domScope) {
            handleDomScope(event, domScope, elms, dataItem, dontPrevent);
        }

// ----------------------------------------------------------------------------- WINDOW LOCATION PATH, SEARCH, HASH
        handleStateValues(event);

        for (var i = 0; i < outConfig.length; ++i) {

            config = outConfig[i];
            to = null;

            // check if target instance exists and set new scope
            if (config.to && !(to = cache.I[config.to])) {
                continue;
            }

            // update scope
            var eSelf = to || self;

// ----------------------------------------------------------------------------- DATA MERGING
            handleDataMerging(self, config, data)

            // collect elements to load
            if (config.load) {
                loadElms.push(config.load);
            }

// ----------------------------------------------------------------------------- CALL, EMIT AND ROUTE
            callEmitRoute(self, eSelf, event, config, data);
        }

        // load elements in parallel
        loadElms[0] && engine.module(self, null, self, {load: loadElms}, function () {});
    };
}

function handleDomScope (event, domScope, elms, dataItem, dontPrevent) {

    // add dom scope to event
    event._scope = event._scope || domScope;

    // dont prevent default browser actions
    if (!dontPrevent) {
        event.preventDefault();
    }

    // add found elements to event
    event._elms = elms;

    // add index of found elements
    event._item = event._item || dataItem;
}

function handleStateValues (event) {

    // add pathname to data object
    event._path = window.location.pathname.substr(1).split('/');

    // parse and append url search to data
    if (window.location.search && !event._search) {
        event._search = searchToJSON();
    }

    // append url hash to data
    if (window.location.hash && !event._hash) {
        event._hash = window.location.hash.substr(1);
    }
}

function handleDataMerging (self, config, data) {

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

                // TODO global scope should also be an option
                _domElm[0] = document.querySelector(_domElm[0]);

                // get an attribute
                if (_domElm[1]) {
                    _domElm[1] = _domElm[0][_domElm[1]];
                }

                // add dom attribute value or the element itself
                data[key] = _domElm[1] === undefined ? _domElm[0] : _domElm[1];

            // get search value with a path: 1. events, 2. data, 3. instance, 4. window
            } else {
                data[key] = engine.path(path, event, true) || engine.path(path, data, true) || engine.path(path);
            }
        }

        // create deep object out of flat keys
        data = engine.deep(data);
    }
}

function callEmitRoute (self, eSelf, event, config, data) {

    // adapt to method
    if (config.route) {
        engine.route(parsePath.call(self, config.route, data), data);
    }

    // emit an event
    if (config.emit) {
        eSelf.emit.call(eSelf, config.emit, event, data);
    }

    // call a method
    if (config.call) {

        // find call method when the event handler is called
        if (typeof config.call === 'string' && typeof (config.call = eSelf._path(config.call)) !== fn) {
            return console.error(self._name + ':', 'Cannot call', eSelf._name + ':' + config.call);
        }

        // call method
        config.call.call(eSelf, event, data);
    }
}

/**
 * Replace data fields in a string.
 *
 * @private
 * @param {string} The string.
 * @param {object} The data context.
 */
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

/**
 * Parse a state search string to JSON.
 * Credentials: http://snipplr.com/view/70905/search-string-to-json/
 *
 * @private
 */
function searchToJSON(){
    var rep = {'?':'{"','=':'":"','&':'","'};
    var s = state.search.replace(/[\?\=\&]/g, function(r) {
        return rep[r];
    });
    return JSON.parse(s.length? s+'"}' : "{}");
}
