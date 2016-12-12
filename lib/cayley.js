'use strict'

const exists = require('fs').access;
const libob = require('libobject');
const exec = require('child_process').exec;
const LRU = require('lru-cache');
const API = require('flow-api/lib/cayley');
const toTriple = require('flow-api/lib/utils').toTriple;
const flow_streams = require('flow-streams');

const cache_options = {max: 500};
const vocab = '<http://schema.jillix.net/vocab/';
const type_predicate = '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>';
const RE_method_path = /^([^\/]+)\/([^#]+)(?:#([^\?]+))?\?(.*)$/;

function fCall (fn, scope, state, args, chunk, cb) {
    return fn(scope || {}, state || {}, args || {}, chunk || {}, cb);
} 

function saveRequire (module, method, callback) {
    try {
        if (!(method = libob.path(method, require(module)))) {
            return callback(new Error('Flow-nodejs.adapter.require: Method not found.'));
        }
        callback(null, method);
    } catch (err) {
        callback(err);
    }
}

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base + '/node_modules/';

    const state = {};
    fCall(API.connect, entrypoint, state);

    return {
        cache: LRU(cache_options),
        seq: (scope, sequence_id, session) => {

            // get cayley streams
            let chunk = {readable: API.flow(state.g, sequence_id, session.role)};

            // combine json object streams
            chunk = fCall(flow_streams.combine, scope, null, {readable: 'readable'}, chunk);

            // parse cayley http response streams
            chunk = fCall(flow_streams.json.parse, scope, null, {readable: 'result.*'}, chunk);

            // parse triple data, emit event per triple
            chunk = fCall(toTriple, scope, null, null, chunk);

            return chunk.readable;
        },

        fn: (method_iri, session, cb) => {

            method_iri = method_iri.match(RE_method_path);
            if (!method_iri || !method_iri[1] || !method_iri[2] || !method_iri[4]) {
                return cb(new Error('Flow-nodejs.adapter.fn: Invalid method path.'));
            }

            let owner = method_iri[1];
            let module = method_iri[2];
            let version = method_iri[3];
            let method = method_iri[4];
            let path = entrypoint.module_root + module;

            exists(path, (err) => {

                if (err) {
                    return exec('npm i --prefix ' + entrypoint.base + ' ' + module + (version ? '#' + version : ''), err => {

                        if (err) {
                            return cb(err);
                        }

                        saveRequire(path, method, cb);
                    });
                }

                saveRequire(path, method, cb);
            });
        }
    };
};
