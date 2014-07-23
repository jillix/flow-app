var env = process.env;
var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');

var pojoViews = cache.pojo('views');
var compViews = cache.comp('views');
var snippetCache = cache.pojo('snippets');

var events = {
    ask: 'V>',
    send: '<V',
};

module.exports = setup;

function setup (instance) {

    // setup view
    instance.on(events.ask, factoryService);

    // return view factory
    return factory;
}

// get html snipptets (ws)
function getSnipped (path, callback) {
    var self = this;

    if (!path) {
        return callback();
    }

    path = env.Z_PATH_PROCESS_MARKUP + path.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

    // check cache
    var snippet = snippetCache.get(path);
    if (snippet) {
        return callback(null, snippet);
    }

    // read snippet file
    fs.readFile(path, {encoding: 'utf8'}, function (err, data) {

        if (err) {
            return callback(err);
        }

        // save snippet in cache
        snippetCache.set(path, data);

        callback(null, data);
    });
}

function factory (config, callback) {
    var self = this;
     // create cache key
    var cacheKey = (config.project || '') + self.Z.name + config.name;

    // check cache
    var view = pojoViews.get(cacheKey);
    if (view) {
        return callback(null, view);
    }

    // get system store to fetch models
    self.Z.model({name: env.Z_VIEWS_MODEL, project: config.project}, function (err, views) {

        if (err) {
            return callback(err);
        }

        views.request({m: 'findOne', q: {name: config.name, instance: self.Z.name}}, function (err, view) {

            if (err || !view) {
                return callback(err || 'View "' + config.name + '" of "' + self.Z.name + '" not found');
            }

            // get here the html snipped
            getSnipped(view.html, function (err, snipped) {

                if (err) {
                    return callback(err);
                }

                // add snipped to view
                if (snipped) {
                    view.html = snipped;
                }

                // save view in cache
                pojoViews.set(cacheKey, view);

                callback(null, view);
            });
        });
    });
}

function factoryService (err, message) {
    var self = this;

    // check message
    if (!message) {
        return self.emit(events.send, 'Bad message');
    }

    // create factory config
    if (typeof message === 'string') {
        message = {name: message};
    } else {
        message = {
            name: message[0],
            project: message[1]
        };
    }

    // create model
    factory.call(self, message, function (err, view) {

        if (err) {
            return self.emit(events.send, err);
        }

        // create client view
        var clientView = {
            name: view.name
        };

        // add client config
        if (view.config && view.config.client) {
            clientView.config = view.config.client;
        }

        if (view.O) {
            clientView.O = view.O;
        }

        if (view.L) {
            clientView.L = view.L;
        }

        if (view.html) {
            clientView.html = view.html;
        }

        if (view.to) {
            clientView.to = view.to;
        }

        if (view.css) {
            clientView.css = view.css;
        }

        self.emit(events.send, null, clientView);
    });
}
