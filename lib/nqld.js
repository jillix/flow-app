const readFile = require('fs').readFile;
const resolve = require('path').resolve;
const inspect = require('util').inspect;
const JSONLD = require('jsonld');

readFile(resolve(process.argv[2]), (err, data) => {

    if (err) {
        throw err;
    }

    JSONLD.fromRDF(data.toString(), {format: 'application/nquads'}, (err, doc) => {
        if (err) {
            throw err;
        }

        // doc is JSON-LD
        console.log(inspect(doc, false, null));
    });
});
