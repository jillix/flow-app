#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const Adapter = require(__dirname + '/lib/adapter');
const Entrypoint = require(__dirname + '/lib/entrypoint');
const entrypoint_name = process.argv[2];
const base_path = resolve(process.argv[3] || '.');

!entrypoint_name && error('Missing entrypoint argument.');
Entrypoint(entrypoint_name, entrypoint => {

    entrypoint.base = base_path;

    let flow = Flow(entrypoint.env, Adapter(entrypoint))(entrypoint.sequence);
    flow.on('data', chunk => process.stdout.write(chunk.toString()));
    flow.on('error', error => process.stderr.write(error.stack.toString() + '\n'));
    flow.end(1);
});
