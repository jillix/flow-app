"use strict";

const resolve = require("path").resolve;
const promisify = require("util").promisify;
const access = promisify(require("fs").access);
const exec = promisify(require("child_process").exec);

const REGISTRY_BASE = resolve(__dirname + "/..") + "/";
const HANDLER_BASE = resolve(__dirname + "/handlers") + "/";
const NODE_MODULES = REGISTRY_BASE + "node_modules/";

// npm install
// to where? custom asset folder

module.exports = (fnIri, role) => {
    return parseFnIri(fnIri).then(npmInstall).then(saveRequire);
};

function parseFnIri (fnIri) {

    fnIri = fnIri.split("/");
    if (fnIri.length !== 4) {
        return Promise.reject(new Error("Flow-registry.runtime.fn: Invalid handler path \"" + fnIri.join("/") + "\""));
    }

    let details = {
        owner: fnIri[0],
        module: fnIri[1],
        version: fnIri[2],
        fnName: fnIri[3],
        modulePath: NODE_MODULES + fnIri[1],
        fnPath: HANDLER_BASE + fnIri.join("/") + ".js"
    };

    return Promise.resolve(details);
}

function npmInstall (dependency) {
    let modulePath = NODE_MODULES + dependency.module;
    let module = dependency.owner + "/" + dependency.module + "#" + dependency.version;

    return access(modulePath).then(() => {
        return dependency;
    }).catch((err) => {
        if (err.code === "ENOENT") {
            return exec("npm i --prefix " + REGISTRY_BASE + " " + module)
            .then(() => {
                return dependency;
            });
        } else {
            return Promise.resolve(dependency);
        }
    });
};

function saveRequire (path) {
    try {
        let handler = require(path);
        if (typeof handler !== "function") {
            return Promise.reject(new Error("Flow-registry.runtime.fn: Handler \"" + path + "\" is not a function."));
        }
        return handler;
    } catch (err) {
        Promise.reject(err);
    }
}
