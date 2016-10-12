#!/usr/bin/env node

const Flow = require('flow');
const resolve = require('path').resolve;
const dirname = require('path').dirname;
const readFile = require('fs').readFile;
const Adapter = require('./lib/adapters/cayley');
const entrypoint_name = process.argv[2];
const app_config = resolve(process.argv[3] || '.');
const base_path = dirname(app_config);

!entrypoint_name && error('Missing entrypoint argument.');
readFile(app_config, (err, config) => err ? error(err.stack) : initEntrypoint(getEntrypoint(config)));

function initEntrypoint (entrypoint) {
    console.log(entrypoint)
    let flow = Flow(Adapter(entrypoint))(entrypoint.emit);
    flow.on('data', chunk => process.stdout.write(chunk.toString()));
    flow.on('error', error => process.stderr.write(error.stack.toString()));
    flow.end(1);
}

function getEntrypoint (config) {

    config = JSON.parse(config.toString());

    if (!config.entrypoints && !config.entrypoints.length) {
        error('No entrypoints defined in config.');
    }

    let entrypoint = config.entrypoints.find((item) => {
        return item.name === entrypoint_name;
    });

    if (!entrypoint.emit) {
        error('No event defined in entrypoint.');
    }

    entrypoint.base = base_path;

    if (entrypoint.env && entrypoint.env.length) {
        environment(entrypoint, config);
    }

    return entrypoint;
}

function environment (entrypoint, config) {
    process.flow_env = {};
    entrypoint.env.forEach((env) => {

        env = config.environments.find((environment) => {
            return environment.name === env;
        });

        !env && error('Entrypoint environment reference "' + name + '" does not exist.');

        Object.assign(process.flow_env, env.vars);
    });
    entrypoint.env = process.flow_env;
}

function error (msg) {
    throw new Error('Flow-nodejs: ' + msg);
}
