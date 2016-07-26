var fs = require('fs');
var path = require('path');
var environment = require('./environment');

module.exports = function (entrypoint, config_path) { 

    fs.readFile(path.resolve(config_path), (err, data) => {

        if (err) {
            throw new Error(err);
        }

        let config = checkConfig(JSON.parse(data.toString())); 
        entrypoint = checkEntrypoint(entrypoint, config);

        // build environment
        if (entrypoint.env && entrypoint.env.length) {
            environment(entrypoint, config);
        }

        // TODO start process
        console.log(entrypoint);
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

    entrypoint = config.entrypoints.find((item) => {
        return item.name === entrypoint;
    });

    if (!entrypoint) {
        error('Entrypoint not found.');
    }

    return entrypoint;
}

function error (msg) {
    throw new Error('Flow-app: ' + msg);
}
