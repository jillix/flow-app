#!/usr/bin/env node

const flow = require('flow');
const path = require('path');
const fs = require('fs');
const argv = require('yargs')
.options('event', {
    alias: 'e',
    required: true
})
.options('network', {
    alias: 'n',
    required: true
})
.options('env', {
    alias: 'v'
})
.argv;

// parse environment
if (argv.env) {
    process.flow_env = JSON.parse(argv.env);
} 

console.log(argv.event, argv.network, process.flow_env);

var stream = flow(argv.event, {
    mic: function (name, callback) {
        callback(null, require(argv.network + '/' + name));
    },
    mod: function (name, callback) {
        callback(null, require(name));
    }
});
stream.on('error', process.stderr.write.bind(process.stderr));
stream.end(1);

