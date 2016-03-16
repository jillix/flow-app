var Flow = require('flow');
var adapterSet;

// load module instance composition (MIC)
function mic (name, callback) {

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
}

// load module
function mod (name, callback) {

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

module.exports = function (event, options) {

    if (!adapterSet) {
        options = options || {};
        options.mod = mod;
        options.mic = mic;
        adapterSet = true;
    }

    return Flow(event, options);
};
