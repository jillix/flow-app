var env = process.env;
var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');

var pojoViews = cache.pojo('views');
var compViews = cache.comp('views');
var snippetCache = cache.file('snippets', true);

module.exports = setup;

function setup (instance) {

    // setup view
    instance.on(env.Z_SEND_VIEW_REQ, factoryService);

    // return view factory
    return factory;
}

function factory (name, role, callback) {
    var self = this;

    // check cache
    var view = pojoViews.get(name);
    if (view) {
        return callback(null, view);
    }

    // get system store to fetch models
    compViews.set(name, role, function (err, view) {

        if (err) {
            return callback(err);
        }

        if (!view.html) {

            // save view in cache
            pojoViews.set(name, view);

            return callback(null, view);
        }

        var path = env.Z_PATH_PROCESS_MARKUP + view.html.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        snippetCache.set(path, function (err, snipped) {

            if (err) {
                return callback(err);
            }

            // add snipped to view
            view.html = snipped.data.toString('utf8');

            // save view in cache
            pojoViews.set(name, view);

            callback(null, view);
        });
    });
}

function factoryService (err, name) {
    var self = this;
    var session = self.link.ws.session;

    // check message
    if (!name) {
        return self.emit(env.Z_SEND_VIEW_RES, 'Bad message');
    }

    name = self.Z.name + '_' + name;

    // create model
    factory.call(self, name, session[env.Z_SESSION_ROLE_KEY], function (err, view) {

        if (err) {
            return self.emit(env.Z_SEND_VIEW_RES, err);
        }

        // create client view
        var clientView = {
            name: view.name.split('_').pop()
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

        self.emit(env.Z_SEND_VIEW_RES, null, clientView);
    });
}
