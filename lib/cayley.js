'use strict'

const exists = require('fs').access;
const LRU = require('lru-cache');
const cayley = require('cayley');
const exec = require('child_process').exec;
const array_stream = require('./array_stream');
const cache_options = {max: 500};
const vocab = 'http://schema.jillix.net/vocab/';
const type_predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const installed = {};

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base + '/node_modules/';

    const client = cayley(process.flow_env.db);
    const g = client.graph; 

    return {
        cache: LRU(cache_options),
        read: (event_iri, session) => {

            let count = 0;
            const stream = array_stream();
            const array = [];

            // TODO stream API for node cayley
            const handler = (err, result) => {

                if (err) {
                    return stream.emit('error', err);
                }

                if (result && result.length) {
                    result.forEach(item => array.push([item.subject, item.predicate, item.id]));
                }

                if (++count === 3) {

                    if (!array.length) {
                        return stream.emit('error', new Error('Flow-nodejs.adapter.cayley.read: Empty result for "' + event_iri + '".'));
                    }

                    stream.set(array);
                }
            };

            // event
            g.V(event_iri).Tag('subject').Out([
              vocab + 'onError',
              vocab + 'onEnd',
              vocab + 'sequence',
            ], 'predicate').All(handler);

            // sequences
            g.V().Has(
              vocab + 'event',
              event_iri
            ).Has(
              type_predicate,
              vocab + 'Sequence'
            ).Tag('subject').Out([
              vocab + 'instance',
              vocab + 'args',
              vocab + 'dataHandler',
              vocab + 'onceHandler',
              vocab + 'streamHandler',
              vocab + 'emit',
              vocab + 'sequence'
            ], 'predicate').All(handler);

            // instances
            g.V().Has(
              vocab + 'event',
              event_iri
            ).Has(
              type_predicate,
              vocab + 'Sequence'
            ).Out(vocab + 'instance').
            Has(vocab + 'roles', '"' + session.role + '"').
            Tag('subject').Out([
                vocab + 'args',
                vocab + 'roles',
                vocab + 'module'
            ], 'predicate').All(handler);
 
            return stream;
        },

        mod: (module_iri, session, cb) => {

            // TODO role check for modules
            g.V(module_iri).Out([
                'http://schema.org/name',
                'http://schema.jillix.net/vocab/gitRepository'
            ], 'predicate').GetLimit(2, (err, module) => {

                if (err) {
                    return cb(err);
                }

                if (!module || !module[0] || !module[0].id) {
                    return cb(new Error('Flow-nodejs.adapter.cayley.mod: Empty respone for ' + module_iri));
                }

                let name;
                let repo;
                module.forEach(item => {
                    if (item.predicate === vocab + 'gitRepository') {
                        repo = item.id.slice(1, -1);
                    } else {
                        name = entrypoint.module_root + item.id.slice(1, -1);
                    }
                });

                installed[name] ? saveRequire(name, cb) :
                exists(name, (err) => {

                    if (err) {
                        return exec('npm i --prefix ' + entrypoint.base + ' ' + repo + '#flow_v0.1.0', err => {

                            if (err) {
                                return cb(err);
                            }

                            saveRequire(name, cb);
                        });
                    }

                    saveRequire(name, cb);
                });
            });
        }
    };
};

function saveRequire (module, callback) {
    try {
        installed[module] = installed[module] || true;
        callback(null, require(module));
    } catch (err) {
        delete installed[module];
        callback(err);
    }
}
