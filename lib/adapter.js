'use strict'

const exists = require('fs').access;
const libob = require('libobject');
const exec = require('child_process').exec;
const LRU = require('lru-cache');
const API = require('flow-api/lib/cayley_get');
const connect = require('flow-api').connect;
const toArray= require('flow-api/lib/utils').toArray;
const flow_streams = require('flow-streams');
const cache_options = {max: 500};
const RE_method_path = /^<([^\/]+)\/([^#]+)(?:#([^\?]+))?\?(.*)>$/;

function saveRequire (module, method, callback) {
    try {
        let msg_method = method;
        if (!(method = libob.path(method, require(module)))) {
            return callback(new Error('Flow-nodejs.adapter.require: Method "' + msg_method + '"not found on module "' + module + '".'));
        }
        callback(null, method);
    } catch (err) {
        callback(err);
    }
}

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base + '/node_modules/';

    const state = {};
    connect(entrypoint, state);

    return {
        cache: LRU(cache_options),
        seq: (scope, sequence_id, role) => {

            // get cayley streams
            let chunk = {readable: API.flow(state.g, sequence_id, role)};

            // combine json object streams
            chunk = flow_streams.combine(scope, null, {readable: 'readable'}, chunk);

            // parse cayley http response streams
            chunk = flow_streams.json.parse(scope, null, {readable: 'result.*'}, chunk);

            // parse triple data, emit event per triple
            chunk = toArray(scope, null, null, chunk);

            return chunk.readable;
        },

        fn: (method_iri, role, cb) => {

            method_iri = method_iri.match(RE_method_path);
            if (!method_iri || !method_iri[1] || !method_iri[2] || !method_iri[4]) {
                return cb(new Error('Flow-nodejs.adapter.fn: Invalid method path.'));
            }

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
