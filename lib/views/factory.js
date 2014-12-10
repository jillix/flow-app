var env = process.env;
var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');
var fingerprint = require(env.Z_PATH_UTILS + 'fingerprint');
var compViews = cache.comp('views');
var snippetCache = cache.file('snippets', {wd: env.Z_PATH_PROCESS_MARKUP, noCompression: true});

module.exports = factoryService;

function factory (name, role, callback) {
    var self = this;

    // check cache
    var view = compViews.pojo.get(name, role);

    // handle no access
    if (view === 0) {
        return callback(new Error('View ' + name + ' not found.'));
    }

    // return view from cache
    if (view) {
        return callback(null, view);
    }

    // get system store to fetch models
    compViews.get(name, role, function (err, view, viewChanged) {

        if (err || !view) {
            return callback(err || new Error('View ' + name + ' not found.'));
        }

        // save roles in view
        view._roles = view.roles;

        // add commit ids to css files
        fingerprint.addToFiles(null, view.css || [], function (err, css) {

            if (err) {
                return callback(err);
            }

            // update css
            if (css) {
                view.css = css;
            }

            if (!view.html) {

                // save view in cache
                compViews.pojo.set(name, view);

                return callback(null, view);
            }

            var path = view.html.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, '');
            snippetCache.set(path, function (err, snipped) {

                if (err) {
                    return callback(err);
                }

                // add snipped to view
                view.html = snipped.data.toString('utf8');

                // remove view on snippet change
                if (!viewChanged) {
                    snippetCache.obs.once('change:' + path, function () {
                        compViews.rm(name, role);
                    });
                }

                // save view in cache
                compViews.pojo.set(name, view);

                callback(null, view);
            });
        });
    });
}

function factoryService (err, name, callback) {
    var self = this;

    // check message
    if (!name) {
        return callback('Bad message');
    }

    // create model
    factory.call(self, name, self.link.role, function (err, view) {

        if (err) {
            return callback(err);
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

        if (view.dontEscape) {
            clientView.dontEscape = view.dontEscape;
        }

        if (view.leaveKeys) {
            clientView.leaveKeys = view.leaveKeys;
        }

        callback(null, clientView);
    });
}
