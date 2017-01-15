'use strict'

const exists = require('fs').access;
const exec = require('child_process').exec;
const LRU = require('lru-cache');
const libob = require('libobject');
const cache_options = {max: 500};
const RE_method_path = /^<([^\/]+)\/([^#]+)(?:#([^\?]+))?\?(.*)>$/;

function saveRequire (module, method, callback) {
    try {
        let msg_method = method;
        if (!(method = libob.path.get(method, require(module)))) {
            return callback(new Error('Flow-nodejs.adapter.require: Method "' + msg_method + '" not found on module "' + module + '".'));
        }
        callback(null, method);
    } catch (err) {
        callback(err);
    }
}

module.exports = (store, entrypoint) => {

    return {
        cache: LRU(cache_options),
        seq: (scope, sequence_id, role) => {
            return store.sequence(sequence_id, role);
        },

        fn: (method_iri, role, cb) => {

            method_iri = method_iri.match(RE_method_path);
            if (!method_iri || !method_iri[1] || !method_iri[2] || !method_iri[4]) {
                return cb(new Error('Flow-nodejs.adapter.fn: Invalid method path.'));
            }

            // TODO require method with file path
            // module_root, module#version /paht/to/file.js

            let path = entrypoint.module_root + method_iri[2];
            exists(path, (err) => {
                if (err) {
                    return exec('npm i --prefix ' + entrypoint.base + ' ' + method_iri[1] + '/'  +  method_iri[2] + (method_iri[3] ? '#' + method_iri[3]: ''), err => {

                        if (err) {
                            return cb(err);
                        }

                        saveRequire(path, method_iri[4], cb);
                    });
                }

                saveRequire(path, method_iri[4], cb);
            });
        }
    };
};
