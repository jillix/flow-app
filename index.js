#!/usr/bin/env node

// read CLI arguments
var repo = process.argv[2];
var port = process.argv[3];
var user = process.argv[4];
var key = process.argv[5];
var production = process.argv[6] === 'PRO' ? true : false;

// check the CLI arguments
if (!repo || !port || !user || !key) {
    throw new Error('Invalid CLI arguments Example: ./index.js /absolute/path/to/repo 8000 USERID APIKEY [PRO]');
}

// start engine
require('./lib/engine')(repo, port, user, key, production);
