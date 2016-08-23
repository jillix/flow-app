'use strict'

const array_stream = require('../array_stream');
const resolve = require('path').resolve;
const readFile = require('fs').readFile;

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {    
        mic: (name, options, cb) => {

            // TODO access check

            readFile(resolve('./instance.nq'), (err, data) => {

                if (err) {
                    return cb(err); 
                }

                data = data.toString().split('\n');
                data.forEach((triple, index) => {
                    if (triple[0] === '#') {
                        return; //console.log('Comment:', triple);
                    }
                    data[index] = triple.replace(/<([^<>]*)>/g, '$1').split(' ', 3);
                });

                cb(null, array_stream(data));
            });
            //cb(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
