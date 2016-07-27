var fs = require('fs');
var path = require('path');
var environment = require('./environment');
var start = require('./start');

module.exports = function (entrypoint, infrastructure, config_path) { 
    fs.readFile(path.resolve(config_path), (err, data) => {

        if (err) {
            throw new Error(err);
        }

        let config = checkConfig(JSON.parse(data.toString())); 
        entrypoint = checkEntrypoint(entrypoint, config);
        infrastructure = checkInfrastructure(infrastructure, config);

        // build environment
        if (entrypoint.env && entrypoint.env.length) {
            environment(entrypoint, config);
        }

        start(entrypoint, infrastructure);

        process.exit(1);
    });
};

function checkConfig (config) {
    // TODO use jsonld schema + content validation

    if (!config) {
        error('No config defined.');
    }

    if (!config.entrypoints && !config.entrypoints.length) {
        error('No entrypoints defined in config.');
    }

    if (!config.entrypoints && !config.entrypoints.length) {
        error('No infrastructure defined in conig.');
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

    if (!entrypoint.event) {
        error('No event defined in entrypoint.');
    }

    return entrypoint;
}

function checkInfrastructure (inf_config, config) {

    inf_config = config.infrastructure.find((item) => {
        return item.name === inf_config;
    }).config;

    if (!inf_config) {
        error('Infrastructure config not found.');
    }

    if (!inf_config.command) {
        error('No CLI command defined in infrastructure config.');
    }

    if (!inf_config.network) {
        error('No network defined in infrastructure config.');
    }

    return inf_config;
}
function error (msg) {
    throw new Error('Flow-app: ' + msg);
}
