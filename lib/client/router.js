// observer module
(function (global, body, state) {

    var engine = global.E;
    var cur_location;

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

        var path = state.pathname;
        var current = state.href.split(/^(.*:)\/\/([a-z\-.]+)(:[0-9]+)?(.*)$/)[4];
        var prev_location;

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
            global.history.pushState(0, 0, url);
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
            prev: prev_location,
            _rt: true
        };

        // emit url state on all instances
        engine.emit({state: url, all: true}, stateEvent, data);
    };

// pass environment
})(this, document, location);