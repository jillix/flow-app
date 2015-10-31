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
            callback(null, require(name));
        };

        // set url and append dom script elm to the document head
        node.src = '/' + name + '/client.js';
        document.head.appendChild(node);
        node.remove();
    },

    // USED IN flow.js
    composition: function (name, callback) {

        // load composition
        // TODO request/response events
        this.flow('/C', callback);
    },

    request: server.request,

    /**
     * Load html snippets.
     *
     * @public
     * @param {array} The array containing html snippet file urls.
     */
    // USED IN instance.js
    markup: function (urls) {

        // TODO use xhr2 to benefit from browser caching
        // TODO request/response events
        this.flow('/M', url, function () {});

        // TODO load all urls
        urls.forEach(function (url) {

        })
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
    log: function (err) {return err}, //require('./logs') ||

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
flow.load();
