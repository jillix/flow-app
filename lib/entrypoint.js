const fs = require('fs');
const path = require('path');
const start = require('./start');

// TODO set default values
// TODO validate config data

module.exports = function (entrypoint, infrastructure, config_path) {
    config_path = path.resolve(config_path);
    fs.readFile(config_path, (err, data) => {

        if (err) {
            throw new Error(err);
        }

        let config = checkConfig(JSON.parse(data.toString())); 
        let command = getEntrypointCommand(infrastructure, config);

        // add base path to config
        config.base = path.dirname(config_path);

        // build and start entrypoints
        if (entrypoint) {
            entrypoint = buildEntrypoint(config, config.entrypoints.find((item) => {
                return item.name === entrypoint;
            }));

            start(entrypoint, command);
        } else {
            config.entrypoints.forEach((item) => {
                entrypoint = buildEntrypoint(config, item);
                start(entrypoint, command);
            });
        }
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
}

function buildEntrypoint (config, entrypoint) {

    checkEntrypoint(entrypoint);

    // resolve network path
    // TODO only if network is a dir!
    // TODO check if folder exists
    if (entrypoint.network.type === 'fs') {
        entrypoint.network = path.resolve(config.base, entrypoint.network.path);
    }

    entrypoint.base = config.base;

    // build environment
    if (entrypoint.env && entrypoint.env.length) {
        environment(entrypoint, config);
    }

    return entrypoint;
}

function checkEntrypoint (entrypoint) {
    if (!entrypoint) {
        error('Entrypoint not found.');
    }

    if (!entrypoint.event) {
        error('No event defined in entrypoint.');
    }

    if (!entrypoint.network) {
        error('No network defined in entrypoint.');
    } 

    return entrypoint;
}

function environment (entrypoint, config) {
    let environment = {};

    entrypoint.env.forEach((name) => {
        let env = config.environments.find((env) => {
            return env.name === name;
        });

        if (!env) {
            throw new Error('Flow-app.environment: Entrypoint environment reference "' + name + '" does not exist.');
        }

        Object.assign(environment, env.vars);
    });

    entrypoint.env = environment;
}

function getEntrypointCommand (inf_config, config) {

    inf_config = config.infrastructure.find((item) => {
        return item.name === inf_config;
    });

    if (!inf_config) {
        error('Infrastructure config not found.');
    }

    inf_config = inf_config.config;
    if (!inf_config.start) {
        error('No CLI command defined in infrastructure config.');
    } 

    return inf_config.start;
}

function error (msg) {
    throw new Error('Flow-app: ' + msg);
}
