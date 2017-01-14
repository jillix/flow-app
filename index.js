#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const Store = require(__dirname + '/node_modules/flow-api/lib/store');
const Adapter = require(__dirname + '/lib/adapter');
const Entrypoint = require(__dirname + '/lib/entrypoint');
const entrypoint_name = process.argv[2];

if (!entrypoint_name) {
    process.stderr.write('Missing entrypoint argument.');
    process.exit(0);
}

// create store instance from config file
const store = Store(require(__dirname + '/config.json'));

// get entrypoint
Entrypoint(store, entrypoint_name, (entrypoint) => {

    entrypoint.base = __dirname;

    // init flow and emit first sequence
    let flow = Flow(entrypoint.env, Adapter(store, entrypoint))(entrypoint.sequence);
    flow.on('data', chunk => process.stdout.write(chunk.toString()));
    flow.on('error', error => process.stderr.write(error.stack.toString() + '\n'));
    flow.end(1);
});
