var fs = require('fs');
var path = require('path');

module.exports = function (args) { 

    // TODO read config
    var config = {};

    checkConfig(config);

    // ..
};

function checkConfig (config) {
    // TODO use jsonld schema + content validation

    if (!config) {
        error('No config defined.');
    }

    if (!config.adapter) {
        error('No adapter config found.');
    }

    if (!config.mics) {
        error('No mics config found.');
    }

    if (!config.entrypoints && !config.entrypoints.length) {
        error('No entrypoints found.');
    }
};

function error (msg) {
    throw new Error('Flow-app: ' + msg);
}
