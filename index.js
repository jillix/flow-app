#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const FlowApi = require(__dirname + '/node_modules/flow-api');
const Adapter = require(__dirname + '/lib/adapter');
const Entrypoint = require(__dirname + '/lib/entrypoint');
const entrypoint_name = process.argv[2];

// TODO choose store?
// config file or environment
const store = FlowApi.Store({
    store: "cayley",
    config: "http://localhost:64210"
});

!entrypoint_name && error('Missing entrypoint argument.');
Entrypoint(store, entrypoint_name, (entrypoint) => {

    entrypoint.base = __dirname;

    let flow = Flow(entrypoint.env, Adapter(store, entrypoint))(entrypoint.sequence);
    flow.on('data', chunk => process.stdout.write(chunk.toString()));
    flow.on('error', error => process.stderr.write(error.stack.toString() + '\n'));
    flow.end(1);
});
