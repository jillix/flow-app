"use strict"

const resolve = require("path").resolve;
const promisify = require("util").promisify;
const access = promisify(require("fs").access);
const exec = promisify(require("child_process").exec);

const HANDLER_BASE = resolve(__dirname + "/handlers") + "/";
const FLOW_ASSETS = __dirname + "/flow_assets/";
const NODE_MODULES = "";

// npm install
// to where? custom asset folder
// every handler has its own dependencies
// what is a handler IRI, when there's no module?
// <safe://publicid/handlers/handler_id> -> descriptor
// <safe://publicid/handlers/handler_id#js> -> code

// TODO dependency list:
// - make sure all deps are installed
// - require handler
module.exports = (fnIri, role) => {

    fnIri = fnIri.split("/");
    if (fnIri.length !== 4) {
        return Promise.reject(new Error("Flow-registry.runtime.fn: Invalid handler path \"" + fnIri.join("/") + "\""));
    }

    let parsed = {
        owner: fnIri[0],
        module: fnIri[1],
        version: fnIri[2],
        fnName: fnIri[3],
        modulePath: NODE_MODULES + fnIri[1],
        fnPath: HANDLER_BASE + fnIri.join("/") + ".js"
    };

    let modulePath = NODE_MODULES + parsed.module;
    let module = parsed.owner + "/" + parsed.module + "#" + parsed.version;

    return access(modulePath).then(() => {
        return parsed.fnPath;
    }).catch((err) => {
        return Promise.resolve(parsed.fnPath);
        if (err.code === "ENOENT") {
            return exec("npm i --prefix " + __dirname + " " + module)
            .then(() => {
                return parsed.fnPath;
            });
        } else {
            return parsed.fnPath;
        }
    }).then(require);
};
