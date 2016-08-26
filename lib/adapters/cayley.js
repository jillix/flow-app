'use strict'

const array_stream = require('../array_stream');
const resolve = require('path').resolve;
const readFile = require('fs').readFile;

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
        modules: {},
        instances: {},
        events: {},
        streams: {},
        read: (name, options, cb) => {

            // TODO access check

            readFile(resolve('./instance.nq'), (err, data) => {

                if (err) {
                    return cb(err); 
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

                cb(null, array_stream(triples));
            });
            //cb(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
