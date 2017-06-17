#!/usr/bin/env node
"use strict"

require(__dirname + "/node_modules/" + "flow");

const promisify = require("util").promisify;
const readFile = promisify(require("fs").readFile);
const path = require("path");
const open = promisify(require("fs").open);
const exec = promisify(require("child_process").exec);
const sequence_id = process.argv[2];
const app_base_path = path.resolve(process.argv[3] || ".");
const cache = {};

if (!sequence_id) {
    process.stderr.write("Start sequence missing. Example: flow sequenceId");
    process.exit(0);
}
process.env.FLOW_BASE = app_base_path;

Flow({
    set: (key, val) => {
        return cache[key] = val;
    },
    get: (key) => {
        return cache[key];
    },
    del: (key) => {
        delete cache[key];
    },
    seq: (sequence_id, role) => {
        return readFile(app_base_path + "/sequences/" + sequence_id + ".json").then(JSON.parse);
    },
    fnc: (fn_iri, role) => {
        return new Promise((resolve, reject) => {
            process.nextTick(()=>{
                require(app_base_path + "/handlers/" + fn_iri);
                resolve(fn_iri);
            });
        });
    },
    dep: (name, dependency, role) => {
        return open(path.resolve(app_base_path + "/node_modules/" + name), "r")
        .catch((err) => {
            if (err.code === "ENOENT") {
                return exec("npm i --production --prefix " + app_base_path + " " + dependency.trim());
            }
            return Promise.reject(err);
        });
    }
})({
    sequence: sequence_id,
    role: "3389dae361af79b04c9c8e7057f60cc6",
    base: app_base_path
})
.then((output) => {
    console.log("Flow output:", output);
})
.catch((err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString() + "\n");
});
