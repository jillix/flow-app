var Flow = require('./flow/flow');
var server = require('./socket');

// init flow with core module
var flow = Flow({

    // load module bundles and return the entry-point exports
    // USED IN flow.js
    module: function (name, callback) {

        // crate script dom element
        var node = document.createElement('script');

        node.onload = function () {
            node.remove();
            callback(null, require(name));
        };

        // set url and append dom script elm to the document head
        node.src = name[0] === '/' ? name : '/' + name + '/client.js';
        document.head.appendChild(node);
    },

    // load composition
    // USED IN flow.js
    composition: function (name, callback) {
        this.flow('/@:C/' + name, {
            net: '/'
        }, function (err, composition) {
            composition = JSON.parse(composition);
            composition._roles = {'*': true};
            callback(err, composition);
        });
   },

    request: server.request,

    /**
     * Load html snippets.
     *
     * @public
     * @param {array} The array containing html snippet file urls.
     */
    // USED IN instance.js
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
    /**
     * Load css files.
     *
     * @public
     * @param {array} The array containing css file urls.
     */
    // USED IN instance.js
    styles: function (urls) {
        urls.forEach(function (url) {
            var link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('href', url);
            global.document.head.appendChild(link);
        });
    },

    // USED IN flow.js
    reset: function () {

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
    }
});

server.start(flow);
flow.load('*');

