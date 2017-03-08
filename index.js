#!/usr/bin/env node

const resolve = require('path').resolve;
const Flow = require(__dirname + '/node_modules/flow');
const Adapter = require(__dirname + '/lib/adapter');
const sequence_id = process.argv[2];
const application_dir = resolve(process.argv[3] || '.');

if (!sequence_id) {
    process.stderr.write('Start sequence missing. Example: flow sequenceId');
    process.exit(0);
}

// TODO get sequence id by name, or just ID?

//entrypoint.env._modDir = entrypoint.module_root;
//entrypoint.env._appDir = application_dir;
 
// init flow and emit first sequence
const event = Flow(Adapter(application_dir))({
    sequence: sequence_id,
    role: '_:3389dae361af79b04c9c8e7057f60cc6'
});
process.stdin.pipe(event).pipe(process.stdout);
event.on("error", (err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString());
});
