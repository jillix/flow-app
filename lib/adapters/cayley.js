'use strict'

const array_stream = require('../array_stream');
const test_instance = require('./test_instance.nq');

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {    
        mic: (name, options, cb) => {
            // TODO access check

            cb(null, array_stream(test_instance));
            //cb(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
