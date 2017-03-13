#!/usr/bin/env node

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
} else { 

    const module_root = __dirname + "/node_modules/"
    const readFile = require("fs").readFile;
    const resolve = require("path").resolve;
    const Flow = require(module_root + "flow");
    const Registry = require(module_root + "flow-registry");
    const LRU = require("lru-cache");
    const sequence_id = process.argv[2];
    const base_path = resolve(process.argv[3] || '.');

    if (!sequence_id) {
        process.stderr.write('Start sequence missing. Example: flow sequenceId');
        process.exit(0);
    }

    const event = Flow({
        cache: LRU({max: 500}),
        seq: (sequence_id, role, cb) => {
            readFile(base_path + "/" + sequence_id + ".json", (err, data) => {

                if (err) {
                    return cb(err);
                }

                try {
                    cb(null, JSON.parse(data));
                } catch(err) {
                    cb(err);
                }
            });
        },

        fn: Registry.getFn
    })({
        sequence: sequence_id,
        role: '_:3389dae361af79b04c9c8e7057f60cc6',
        base: base_path
    });

    event.on("error", (err) => {
        err = err.stack ? err.stack : err;
        process.stderr.write(err.toString());
    });

    process.stdin.pipe(event).pipe(process.stdout);
}
