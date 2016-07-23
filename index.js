#!/usr/bin/env node

var app = require('./lib/app');
var argv = require('yargs')

// TODO mandatory args

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

app(argv);
