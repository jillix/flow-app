'use strict'

const LRU = require('lru-cache');
const array_stream = require('../array_stream');
const resolve = require('path').resolve;
const readFile = require('fs').readFile;

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {
        cache: LRU(),
        read: (instance, listener, options) => {

            if (options.session) {
                // TODO access check
            }

            const stream = array_stream();
            stream.on('error', console.error.bind(console));

            readFile(resolve('./instance.nq'), (err, data) => {

                if (err) {
                    return stream.emit('error', err); 
                }

                let triples = [];
                data = data.toString().split('\n');
                data.forEach((triple, index) => {
                    if (triple[0] === '#' || !triple) {
                        return; 
                    }
                    triple = triple.replace(/<([^<>]*)>/g, '$1').split(' ', 3);
                    triples.push({
                        subject: triple[0],
                        predicate: triple[1],
                        object: triple[2]
                    });
                });

                stream.set(triples);
            });

            return stream;
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
