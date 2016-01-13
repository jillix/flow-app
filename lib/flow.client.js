var Flow = require('flow');
var http = require('./http');
var ws = require('./websocket');

// init flow with core module
var CoreInst = Flow({

    // load module bundles and return the entry-point exports
    mod: function (name, callback) {

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

    // load module instance composition (MIC)
    mic: function (name, callback) {

        var fes = this.flow('C', {net: 'http'}, function (err, composition) {
            composition = JSON.parse(composition);
            composition._roles = {'*': true};
            callback(err, composition);
        })
        fes.o.on('error', console.log.bind(console));
        fes.i.end(name);
    },

    net: function (instance, options) {
        return options.net === 'http' ? http.request(options) : ws.mux(instance, options);
    },

    reset: function () {

        // reset module instances
        CoreInst._reset();

        // reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';

        // reset server
        server.reset();

        // load entrypoint
        CoreInst.load('*');
    }
});

CoreInst.load('*');
