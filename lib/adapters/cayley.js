'use strict'

const array_stream = require('../array_stream');
const test_instance = require('./test.nq');

const JSONLD = require('jsonld');
const util = require('util');

module.exports = (entrypoint) => {

    entrypoint.module_root = entrypoint.base = '/node_modules/';

    return {    
        mic: (name, options, cb) => {
            // TODO access check1
            /*
            let triples = '';
            test_instance.forEach((triple, index) => {

                let string = triple[0] + ' ' +
                           triple[1] + ' ' +
                           (triple[2][0] === '_' || triple[2][0] === '<' ? triple[2] : '"' + triple[2] + '"') +
                           ' .\n';

                //if (index >= 73 && index <= 76) {
                    //console.log('TRIPL:', string);
                //}

                triples += string;
            });
            //console.log(triples);
            JSONLD.fromRDF(triples, {format: 'application/nquads'}, (err, doc) => {
                // doc is JSON-LD
                console.log(util.inspect(doc, false, null));
            });
            */
            //cb(null, array_stream([]));
            cb(null, array_stream(test_instance));
            //cb(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, options, cb) => {
            cb(null, require(entrypoint.module_root + name));
        }
    };
};
