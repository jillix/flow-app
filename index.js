#!/usr/bin/env node

const resolve = require('path').resolve;
const dirname = require('path').dirname;
const readFile = require('fs').readFile;
const Flow = require(__dirname + '/node_modules/flow');
const Adapter = require(__dirname + '/lib/cayley');
const entrypoint_name = process.argv[2];
const app_config = resolve(process.argv[3] || './flow.json');
const base_path = dirname(app_config);

!entrypoint_name && error('Missing entrypoint argument.');
initEntrypoint(getEntrypoint(require(app_config)));

function initEntrypoint (entrypoint) {
    let flow = Flow(entrypoint.env, Adapter(entrypoint))(entrypoint.emit, {session: {role: entrypoint.role}});
    flow.on('data', chunk => process.stdout.write(chunk.toString()));
    flow.on('error', error => process.stderr.write(error.stack.toString() + '\n'));
    flow.end(1);
}

function getEntrypoint (config) {
    if (!config.entrypoints && !config.entrypoints.length) {
        error('No entrypoints defined in config.');
    }

    let entrypoint = config.entrypoints.find((item) => {
        return item.name === entrypoint_name;
    });

    if (!entrypoint) {
        error('Entrypoint "' + entrypoint_name  + '" not found in config.');
    }

    if (!entrypoint.emit) {
        error('No event defined in entrypoint.');
    }

    entrypoint.base = base_path;
    entrypoint.role = entrypoint.role || '*';//'__entrypoint__';

    if (entrypoint.env && entrypoint.env.length) {
        environment(entrypoint, config);
    }

    return entrypoint;
}

function environment (entrypoint, config) {
    const _env = {};
    entrypoint.env.forEach((env) => {

        env = config.environments.find((environment) => {
            return environment.name === env;
        });

        !env && error('Entrypoint environment reference "' + name + '" does not exist.');

        Object.assign(_env, env.vars);
    });

    entrypoint.env = _env;
}

function error (msg) {
    throw new Error('Flow-nodejs: ' + msg);
}
