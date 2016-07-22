#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var argv = require('yargs')

// entrypoint
.options('entrypoint', {
    alias: 'e',
    default: null
})

// config
.options('config', {
    alias: 'c',
    default: '/usr/flow/config.json'
})

// script
.options('run', {
    alias: 'r',
    default: null
})

// mics
.options('mics', {
    alias: 'm',
    default: '/usr/flow/mics'
})

.usage('flow-app ...')
.example('flow-app -e [ENTRYPOINT] -c [CONFIG] -r [SCRIPT] -m [MICS]', 'All options.')
.help('h')
.alias('h', 'help')
.strict()
.argv;

console.log(argv);
