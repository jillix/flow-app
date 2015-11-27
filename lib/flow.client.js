var Flow = require('flow');
var server = require('./socket');

// init flow with core module
var CoreInst = Flow({

    // load module bundles and return the entry-point exports
    module: function (name, callback) {

        // crate script dom element
        var node = document.createElement('script');
        var path = name + '/bundle.js';
        node.onload = function () {
            node.remove();
            name = name[0] === '/' ? path : name;
            callback(null, require(name));
        };

        // set url and append dom script elm to the document head
        node.src = (name[0] === '/' ? '/app_module' : '/module/') + path;
        document.head.appendChild(node);
    },

    // load composition
    composition: function (name, callback) {
        this.flow('C/' + name, {
            net: '/',
            to: '@'
        }, function (err, composition) {
            composition = JSON.parse(composition);
            composition._roles = {'*': true};
            callback(err, composition);
        });
    },

    request: server.request,

    // Load html snippets.
    markup: function (urls, callback) {

        var self = this;
        var count = 0;
        var snippets = {};
        var errorHappend;
        var next = function (url, index) {
            self.flow(url, {net: '/'}, function (err, snippet) {

                if (errorHappend) {
                    return;
                }

                if (err) {
                    errorHappend = true;
                    return callback(err);
                }

                snippets[url] = snippet;

                if (++count === urls.length) {
                    callback(null, snippets, true);
                }
            });
        };

        urls.forEach(next);
    },
    
    // Load css files.
    styles: function (urls) {
        urls.forEach(function (url) {
            var link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', url);
            global.document.head.appendChild(link);
        });
    },

    reset: function () {

        // reset module instances
        CoreInst.reset();

        // reset DOM body
        document.body.innerHTML = '';

        // remove styles
        var styles = document.head.querySelectorAll('link[rel=stylesheet]');
        if (styles) {
            styles.forEach(function (stylesheet) {
                stylesheet.remove();
            });
        }

        // reset server
        server.reset();

        // load entrypoint
        CoreInst.load('*');
    }
});

CoreInst.load('*');
