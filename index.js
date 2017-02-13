#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const Store = require(__dirname + '/node_modules/flow-api/lib/store');
const Adapter = require(__dirname + '/lib/adapter');
const Entrypoint = require(__dirname + '/lib/entrypoint');
const entrypoint_name = process.argv[2];
const application_dir = resolve(process.argv[3] || '.');

if (!entrypoint_name) {
    process.stderr.write('Missing entrypoint argument.');
    process.exit(0);
}

// create store instance from config file
const store = Store(require(__dirname + '/config.json'));

// get entrypoint
Entrypoint(store, entrypoint_name, (entrypoint) => {

    entrypoint.base = __dirname;
    entrypoint.module_root = entrypoint.base + '/node_modules/';
    entrypoint.env._modDir = entrypoint.module_root;
    entrypoint.env._appDir = application_dir;

    // init flow and emit first sequence
    const flow = Flow(entrypoint.env, Adapter(store, entrypoint))(entrypoint.sequence, null, true);
    flow.done = (err) => {
        err && process.stderr(err);
    };
    process.stdin.pipe(flow).pipe(process.stdout)
    flow.on("error", (err) => {process.stderr.write(err && err.stack ? err.stack.toString() : err)});
    //flow.err.pipe(process.stderr);
});
