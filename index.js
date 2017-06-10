#!/usr/bin/env node

const module_root = __dirname + "/node_modules/";
const Flow = require(module_root + "flow");
const promisify = require("util").promisify;
const readFile = promisify(require("fs").readFile);
const resolve = require("path").resolve;
const handler = require("./lib/handler");
const LRU = require("lru-cache");
const sequence_id = process.argv[2];
const base_path = resolve(process.argv[3] || ".");

if (!sequence_id) {
    process.stderr.write("Start sequence missing. Example: flow sequenceId");
    process.exit(0);
}

// set base path in evnironment
process.env.flow_base = base_path;
const event = Flow({
    cache: LRU({max: 500}),
    seq: (sequence_id, role) => {
        return readFile(base_path + "/" + sequence_id + ".json").then(JSON.parse);
    },
    fn: handler
})({
    sequence: sequence_id,
    role: "_:3389dae361af79b04c9c8e7057f60cc6",
    base: base_path
})

/*event.catch((err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString());
});*/

event.on("error", (err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString());
});

process.stdin.pipe(event).pipe(process.stdout);
