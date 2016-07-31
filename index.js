#!/usr/bin/env node
'use strict'

//import flow from 'flow';
const flow = require('flow');

// check if an file path is in argv,
// thus read the entrypoint from there.
if (process.argv[2]) {
    //import {readFile} from 'fs';
    //import {resolve} from 'path';
    const readFile = require('fs').readFile;
    const resolve= require('path').resolve;
    readFile(resolve(process.argv[2]), (err, data) => {
        if (err) {
            throw err;
        }

        try {
            data = JSON.parse(data.toString());
        } catch (err) {
            throw err;
        }

        initEntrypoint(data);
    })

// expect a IPC message with the entrypoint.
} else {
    process.on('message', initEntrypoint);
}

// emit entrypoint event
function initEntrypoint (entrypoint) {

    // append mandatory flow environment
    if (entrypoint.env) {
        process.flow_env = entrypoint.env;
    } 

    // TODO move adapater to separate file
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
}
