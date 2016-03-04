var Flow = require('flow');
global.flow = function (event, options) {

    if (event !== 'string') {
        throw Error('Flow: No init event.');
    }

    options = options || {};

    // load module instance composition (MIC)
    options.mic = function (name, callback) {

        httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                var composition = httpRequest.responseText;
                if (httpRequest.status === 200) {
                    composition = JSON.parse(composition);
                    composition._roles = {'*': true};
                    callback(null, composition);
                } else {
                    callback(new Error(httpRequest.responseText));
                }
            }
        };
        httpRequest.open('GET', '/_i/' + name + '.json');
        httpRequest.send();
    };

    // load module
    options.mod = function (name, callback) {

        var node = document.createElement('script');
        var path = name + '.js';
        node.onload = function () {
            node.remove();
            name = name[0] === '/' ? path : name;
            callback(null, require(name));
        };

        // set url and append dom script elm to the document head
        node.src = (name[0] === '/' ? '/_c' : '/_m/') + path;
        document.head.appendChild(node);
    };

    Flow(event, options);
};
