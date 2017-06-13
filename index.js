#!/usr/bin/env node
"use strict"

require(__dirname + "/node_modules/" + "flow");

const promisify = require("util").promisify;
const readFile = promisify(require("fs").readFile);
const resolve = require("path").resolve;
const handler = require("./lib/handler");
const LRU = require("lru-cache");
const sequence_id = process.argv[2];
const base_path = resolve(process.argv[3] || ".");
const lru = LRU({max: 500});

if (!sequence_id) {
    process.stderr.write("Start sequence missing. Example: flow sequenceId");
    process.exit(0);
}

// set base path in evnironment
process.env.flow_base = base_path;
Flow({
    set: lru.set.bind(lru),
    get: lru.get.bind(lru),
    del: lru.del.bind(lru),
    seq: (sequence_id, role) => {
        return readFile(base_path + "/" + sequence_id + ".json").then(JSON.parse);
    },
    fnc: handler
})({
    sequence: sequence_id,
    role: "3389dae361af79b04c9c8e7057f60cc6",
    base: base_path
}).catch((err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString() + "\n");
});
