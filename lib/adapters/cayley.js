'use strict'

const LRU = require('lru-cache');
const cayley = require('cayley');
const array_stream = require('../array_stream');
const cache_options = {max: 500};

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base + '/node_modules/';

    const client = cayley(process.flow_env.db);
    const g = client.graph; 

    return {
        cache: LRU(cache_options),
        read: (event_iri, args) => {

            let role = '*'
            if (args.session) {
                role = args.session.role || role;
            }

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
              'http://schema.jillix.net/vocab/onError',
              'http://schema.jillix.net/vocab/onEnd',
              'http://schema.jillix.net/vocab/sequence',
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
              'http://schema.jillix.net/vocab/onceHandler',
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
            Has('http://schema.jillix.net/vocab/roles', '"' + role + '"').
            Tag('subject').Out([
                'http://schema.jillix.net/vocab/args',
                'http://schema.jillix.net/vocab/roles',
                'http://schema.jillix.net/vocab/module'
            ], 'predicate').All(handler);
 
            return stream;
        },

        mod: (module_iri, args, cb) => {
            g.V(module_iri).Out('http://schema.org/name').GetLimit(1, (err, module) => {

                if (err) {
                    return cb(err);
                }

                if (!module || !module[0] || !module[0].id) {
                    return cb(new Error('Flow-nodejs.adapter.cayley.mod: Empty respone for ' + module_iri));
                }

                module = module[0].id;
                module = module[0] === '"' ? module.slice(1, -1) : module;

                try {
                    cb(null, require(entrypoint.module_root + module));
                } catch (e) {
                    cb(e);
                }
            });
        }
    };
};
