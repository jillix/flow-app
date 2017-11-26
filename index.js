#!/usr/bin/env node
"use strict"

const Flow = require(__dirname + "/node_modules/flow");
const safe = require(__dirname + "/node_modules/safe");

const fs = require("fs");
const presolve = require("path").resolve;
const promisify = require("util").promisify;

const exec = promisify(require("child_process").exec);
const access = promisify(fs.access);
const read = promisify(fs.readFile);

const sequence_id = process.argv[2] || "test";
const app_base_path = presolve(process.argv[3] || ".");
const role = process.argv[4];
const cache = {};

if (!sequence_id) {
    process.stderr.write("Start sequence missing.\n");
    process.exit(0);
}

process.env.NODE_PATH = app_base_path + "/node_modules";
require("module").Module._initPaths();
global.require = require;

/*const parseUrl = (url) => (
  (url.indexOf('safe-auth://') === -1) ? url.replace('safe-auth:', 'safe-auth://') : url
);

read(app_base_path + "/safeapp.json").then(JSON.parse).then(safe_config => {

    return safe.initializeApp(safe_config.app).then((app) => {

        return app.auth.genAuthUri(safe_config.containers, {
            own_container: true
        }).then((uri) => {

            return app.auth.openUri(uri).then((uri) => {

                console.log("open done", uri);

                return app.immutableData.create().then((writer)=> {

                    return writer.write("some string\n")
                    .then(() => writer.write("second string"))
                    .then(() => writer.close())
                    .then((address) => {
                        console.log(address);
                        app.immutableData.fetch(address);
                    })
                    .then((reader) => reader.read())
                    .then((payload) => {
                        console.log(payload);
                    })
                });
            });*/

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
                    return read(app_base_path + "/handlers/" + fn_iri + ".js").then((script) => {
                        return new Function("Adapter", "flow", script.toString());
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
        //});
    //});
//}).catch(console.error.bind(console));




