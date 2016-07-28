#!/usr/bin/env node

const flow = require('flow');

// TODO add option to read entrypoint form file (container)

process.on('message', (entrypoint) => {

    // append mandatory flow environment
    if (entrypoint.env) {
        process.flow_env = entrypoint.env;
    } 

    let stream = flow(entrypoint.event, {
        mic: (name, callback) => {
            callback(null, require(entrypoint.network + '/' + name));
        },
        mod: (name, callback) => {
            callback(null, require(name));
        }
    });
    stream.on('error', process.stderr.write.bind(process.stderr));
    stream.end(1);
});
