'use strict'

const LRU = require('lru-cache');
const cayley = require('cayley');
const array_stream = require('../array_stream');
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
        read: (event_iri, args) => {

            console.log('Read:', event_iri);

            let role = '*'
            if (args.session) {
                role = args.session.role || role;
            }

            var count = 0;
            const stream = array_stream();
            const array = [];

            // TODO stream API for node cayley
            // TODO get argument objects
            const handler = (err, result) => {

                if (err) {
                    return stream.emit('error', err);
                }

                result.forEach((item) => {
                    array.push([item.subject, item.predicate, item.id]);
                });

                if (++count === 3) {
                    stream.set(array);
                }
            };

            // event
            g.V(event_iri).Tag('subject').Out([
              'http://schema.jillix.net/vocab/onError',
              'http://schema.jillix.net/vocab/onEnd',
              'http://schema.jillix.net/vocab/sequence',
              'http://schema.org/name'
            ], 'predicate').All(handler);

            // sequences
            g.V().Has(
              'http://schema.jillix.net/vocab/event',
              event_iri
            ).Has(
              'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              'http://schema.jillix.net/vocab/Sequence'
            ).Tag('subject').Out([
              'http://schema.jillix.net/vocab/instance',
              'http://schema.jillix.net/vocab/args',
              'http://schema.jillix.net/vocab/dataHandler',
              'http://schema.jillix.net/vocab/streamHandler',
              'http://schema.jillix.net/vocab/emit',
              'http://schema.jillix.net/vocab/sequence'
            ], 'predicate').All(handler);

            // instances
            g.V().Has(
              'http://schema.jillix.net/vocab/event',
              event_iri
            ).Has(
              'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              'http://schema.jillix.net/vocab/Sequence'
            ).Out('http://schema.jillix.net/vocab/instance').
            Tag('subject').Out([
                'http://schema.jillix.net/vocab/args',
                'http://schema.org/name',
                'http://schema.jillix.net/vocab/roles',
                'http://schema.jillix.net/vocab/module'
            ], 'predicate').All(handler);
 
            return stream;
        },

        mod: (module_id, args, cb) => {
            g.V(module_id).Out('http://schema.org/name').GetLimit(1, (err, module) => {

                if (err) {
                    return cb(err);
                }

                if (!module || !module[0] || !module[0].id) {
                    return cb(new Error('Flow-nodejs.adapter.cayley.mod: Empty respone for ' + module_id));
                }

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
