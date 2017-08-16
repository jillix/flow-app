#!/usr/bin/env node
"use strict"

require(__dirname + "/node_modules/" + "flow");

const fs = require("fs");
const presolve = require("path").resolve;
const promisify = require("util").promisify;
const exec = promisify(require("child_process").exec);
const access = promisify(fs.access);
const read = promisify(fs.readFile);
const sequence_id = process.argv[2];
const app_base_path = presolve(process.argv[3] || ".");
const role = process.argv[4];
const cache = {};

if (!sequence_id) {
    process.stderr.write("Start sequence missing.\n");
    process.exit(0);
}

process.env.NODE_PATH = app_base_path + "/node_modules";
require("module").Module._initPaths();

Flow({
    abp: app_base_path,
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
        return read(app_base_path + "/sequences/" + sequence_id + ".json").then(JSON.parse);
    },
    fnc: (fn_iri, role) => {
        return new Promise((resolve, reject) => {
            process.nextTick(() => {
                try {
                    require(app_base_path + "/handlers/" + fn_iri);
                } catch(err) {
                    return reject(err);
                }

                resolve(fn_iri);
            });
        });
    },
    dep: (name, dependency, role) => {
        return access(presolve(app_base_path + "/node_modules/" + name))
        .catch((err) => {
            return err.code === "ENOENT" ? exec("npm i --production --prefix " + app_base_path + " " + dependency.trim()) : Promise.reject(err);
        });
    }
})(sequence_id, role)
.catch((err) => {
    err = err.stack ? err.stack : err;
    process.stderr.write(err.toString() + "\n");
});
