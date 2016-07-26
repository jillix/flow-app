var fs = require('fs');
var path = require('path');

module.exports = function (entrypoint, config_path) { 

    // TODO read config
    var config = path.resolve(config_path);
    fs.readFile(path.resolve(config_path), (err, data) => {

        if (err) {
            throw new Error(err);
        }

        var config = checkConfig(JSON.parse(data.toString()));

        console.log(entrypoint, config);
    });
};

function checkConfig (config) {
    // TODO use jsonld schema + content validation

    if (!config) {
        error('No config defined.');
    }

    if (!config.network) {
        error('No network config found.');
    }

    if (!config.entrypoints && !config.entrypoints.length) {
        error('No entrypoints found.');
    }

    return config;
};

function checkEntrypoint (entrypoint, config) {

    return;
}


function error (msg) {
    throw new Error('Flow-app: ' + msg);
}
