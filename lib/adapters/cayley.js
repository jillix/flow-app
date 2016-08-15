'use strict'

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {    
        mic: (name, options, cb) => {
            // TODO access check
            cb(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
