'use strict'

const exists = require('fs').access;
const LRU = require('lru-cache');
const cayley = require('cayley');
const exec = require('child_process').exec;
const libob = require('libobject');
const array_stream = require('./array_stream');
const cache_options = {max: 500};
const vocab = '<http://schema.jillix.net/vocab/';
const type_predicate = '<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>';
const RE_method_path = /^([^\/]+)\/([^#]+)(?:#([^\?]+))?\?(.*)$/;

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base + '/node_modules/';

    const client = cayley(entrypoint.env.db);
    const g = client.graph; 

    return {
        cache: LRU(cache_options),
        seq: (sequence_id, session) => {

            let count = 0;
            const stream = array_stream();
            const array = [];

            // TODO stream API for node cayley
            const handler = (err, result) => {

                if (err) {
                    return stream.emit('error', err);
                }

                if (result && result.length) {
                    result.forEach(item => array.push([
                        item.subject[0] === '<' ? item.subject.slice(1, -1) : item.subject,
                        item.predicate.slice(1, -1),
                        item.id[0] === '<' ? item.id.slice(1, -1) : item.id
                    ]));
                }

                if (++count === 2) {

                    if (!array.length) {
                        return stream.emit('error', new Error('Flow-nodejs.adapter.cayley.read: Empty result for "' + sequence_id + '".'));
                    }

                    stream.set(array);
                }
            };

            // sequence
            sequence_id = '_:' + sequence_id;
            g.V(sequence_id).Tag('subject')
            .Has(vocab + 'roles>', session.role)
            .Out([
                vocab + 'roles>',
                vocab + 'onError>',
                vocab + 'onEnd>',
                vocab + 'next>',
            ], 'predicate').All(handler);

            // handlers
            g.V().Has(
                vocab + 'sequence>',
                sequence_id
            ).Has(
                type_predicate,
                vocab + 'Handler>'
            ).Tag('subject').Out([
                vocab + 'state>',
                vocab + 'args>',
                vocab + 'data>',
                vocab + 'once>',
                vocab + 'stream>',
                vocab + 'emit>',
                vocab + 'next>'
            ], 'predicate').All(handler);

            return stream;
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
