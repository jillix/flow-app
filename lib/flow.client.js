var Flow = require('./flow/flow');
var socket = require('./socket');

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
        callback(null, {module: "view"});
    },

    /**
     * Load html snippets.
     *
     * @public
     * @param {array} The array containing html snippet file urls.
     */
    // TODO use xhr2 to use browser caching
    // USED IN instance.js
    markup: function (urls) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/@:M/path', true);
        xhr.onload = function(e) {
          if (this.status == 200) {
              return callback(null, this.response);
          }

          callback();
        };

        urls.forEach(function (url) {
            xhr.send(url);
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

    log: function (err) {return err} //require('./logs') ||
});

socket.start();
flow.load();
