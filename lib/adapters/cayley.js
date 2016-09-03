'use strict'

const LRU = require('lru-cache');
const CayleyTripleIo = require('cayley-triple-io');
const array_stream = require('../array_stream');
const resolve = require('path').resolve;
const readFile = require('fs').readFile;
const cache_options = {
    max: 500,
    dispose: (key, value) => {
        console.log('Cache remove:', key);
    }
};
const cayley = new CayleyTripleIo.Client({
    url: 'http://localhost:64210/',
    prefixes: {
        builder: 'http://service.jillix.com/jillix/service/app/builder/',
        schema: 'http://schema.org/',
        flow: 'http://schema.jillix.net/vocab/',
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    }
});

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {
        cache: LRU(cache_options),
        read: (instance, listener, options) => {

            if (options.session) {
                // TODO access check
            }

            const stream = cayley.createReadStream([
                'flow:ModuleInstanceConfig',
                ['In', 'rdf:type']
            ], {
                out: [
                    'flow:event'
                ]
            });

            return stream;
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
