'use strict'

const LRU = require('lru-cache');
const cayley = require('cayley');
const array_stream = require('../array_stream');
const resolve = require('path').resolve;
const readFile = require('fs').readFile;
const cache_options = {
    max: 500,
    dispose: (key, value) => {
        //console.log('Cache remove:', key);
    }
};

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';
    const client = cayley("http://localhost:64210/");
    const g = client.graph; 

    return {
        cache: LRU(cache_options),
        read: (instance_iri, event_iri, args) => {

            console.log('Read:', instance_iri, event_iri);

            let role = '*'
            if (args.session) {
                role = args.session.role || role;
            }

            var count = 0;
            const stream = array_stream();
            const array = [];

            // TODO stream API for node cayley
            const handler = (err, result) => {

                if (err) {
                    return stream.emit('error', err);
                }

                result.forEach((item) => {
                    array.push([item['0'], item['1'], item.id]);
                });

                if (++count === (event_iri ? 3 : 1)) {
                    stream.set(array);
                }
            };

            // instance
            g.V(instance_iri).
            Has('http://schema.jillix.net/vocab/roles', '"' + role + '"').
            Tag('0').
            Out([
                'http://schema.jillix.net/vocab/args',
                'http://schema.org/name',
                'http://schema.jillix.net/vocab/roles',
                'http://schema.jillix.net/vocab/module'
            ], '1').
            All(handler);

            if (event_iri) {

                // event
                g.V(event_iri).
                Tag('0').
                Out([
                    'http://schema.jillix.net/vocab/onError',
                    'http://schema.jillix.net/vocab/onEnd',
                    'http://schema.jillix.net/vocab/sequence',
                    'http://schema.org/name'
                ], '1').
                All(handler);

                // sequences
                g.V().
                Has(
                    'http://schema.jillix.net/vocab/event',
                    event_iri
                ).
                Has(
                    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                    'http://schema.jillix.net/vocab/Sequence'
                ).
                Tag('0').
                Out([
                  'http://schema.jillix.net/vocab/instance',
                  'http://schema.jillix.net/vocab/args',
                  'http://schema.jillix.net/vocab/dataHandler',
                  'http://schema.jillix.net/vocab/streamHandler',
                  'http://schema.jillix.net/vocab/emit',
                  'http://schema.jillix.net/vocab/sequence'
                ], '1').
                All(handler);
            };
 
            return stream;
        },

        mod: (module_id, args, cb) => {
            g.V(module_id).Out('http://schema.org/name').GetLimit(1, (err, module) => {

                module = module[0].id;
                module = module[0] === '"' ? module.slice(1, -1) : module;

                try {
                    cb(null, require(module));
                } catch (e) {
                    cb(e);
                }
            });
        }
    };
};
