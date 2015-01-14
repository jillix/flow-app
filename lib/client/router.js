// observer module
(function (global, body, state) {

    var engine = global.E;

    /**
     * Emit a route state on all instances and update the browser history.
     *
     * @public
     *
     * @param {string} The url or state name, which is emitted.
     * @param {object} The data object, which is passed to the event.
     * @param {boolean} Indicates if the route is called form a popstate event.
     */
    engine.route = function (url, data, fromPopstate) {

        var self = this;
        var path = win_location.pathname;
        var current = state.href.split(/^(.*:)\/\/([a-z\-.]+)(:[0-9]+)?(.*)$/)[4];

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
    };

// pass environment
})(this, document, location);