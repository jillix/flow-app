var Flow = require('../flow/flow');

// init flow with core module
Flow({

    // load module bundles and return the entry-point exports
    module: function (name, callback) {

        // crate script dom elemeent
        var node = document.createElement('script');

        node.onload = function () {
            callback(null, require(name));
        };

        // set url and append dom script elm to the document head
        node.src = '/' + name + '/client.js';
        document.head.appendChild(node);
        node.remove();
    },
    composition: '@C',
    markup: '@M',
    cache: function () {},
    log: function (err) {return err} //require('./logs') ||
});
