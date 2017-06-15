#!/usr/bin/env node
"use strict"

require(__dirname + "/node_modules/" + "flow");

const promisify = require("util").promisify;
const readFile = promisify(require("fs").readFile);
const resolve = require("path").resolve;
const dependency = require("./lib/dependency");
//const LRU = require("lru-cache");
const sequence_id = process.argv[2];
const base_path = resolve(process.argv[3] || ".");
const handler_base = resolve((process.argv[3] || ".") + "../handlers");
//const lru = LRU({max: 500});
const cache = {};

if (!sequence_id) {
    process.stderr.write("Start sequence missing. Example: flow sequenceId");
    process.exit(0);
}

console.log("HANDLER BASE:", handler_base);

// set base path in evnironment
process.env.flow_base = base_path;
Flow({
    set: (key, val) => {
        cache[key] = val;
    },
    get: (key) => {
        return cache[key];
    },
    del: (key) => {
        delete cache[key];
    },
    seq: (sequence_id, role) => {
        return readFile(base_path + "/" + sequence_id + ".json").then(JSON.parse);
    },
    fnc: (fn_iri, role) => {
        // TODO local or over a network?
        return new Promise((resolve, reject) => {
            process.nextTick(()=>{
                require(handler_base + "/" + fn_iri);
                resolve(fn_iri);
            });
        });
    },
    // TODO install deps locally
    dep: dependency
})({
    sequence: sequence_id,
    role: "3389dae361af79b04c9c8e7057f60cc6",
    base: base_path
})
.then((output) => {
    console.log("Flow output:", output);
})
.catch((err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString() + "\n");
});
