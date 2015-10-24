var FLow = require('../flow/flow');
var bunyan = require('bunyan');
var composition = require('./composition');

Flow({
    module: function loadModule (name, callback) {
        callback(null, require(name));
    },
    composition: composition.json,
    markup: composition.markup,
    cache: function () {},
    log: bunyan,
    paths: {
        'public': global.pkg.repository.local + 'public/',
        'markup': global.pkg.repository.local + 'markup/',
        'composition': global.pkg.repository.local + 'composition/'
    }
});
