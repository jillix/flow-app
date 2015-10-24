//var flow = require('./flow');

// init flow with core module
//flow(this.exports);

exports.composition = '@C';
exports.markup = '@M';

exports.log = function (err) {return err}; //require('./logs') ||

exports.cache = function () {

};

exports.client = function () {

};

exports.module = loadModule;

// load module bundles and retun the entry-point exports
function loadModule (name, callback) {

    // crate script dom elemeent
    var node = document.createElement('script');

    node.onload = function () {
        callback(null, require(name));
    };

    // set url and append dom script elm to the document head
    node.src = '/' + name + '/client.js';
    document.head.appendChild(node);
    node.remove();
}
