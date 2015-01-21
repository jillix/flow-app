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

// system roles
process.env.Z_ROLE_MODULE = '_module';

// session values
process.env.Z_SESSION_PUBLIC = '*';
process.env.Z_SESSION_ROLE_KEY = 'role';
process.env.Z_SESSION_LOCALE_KEY = 'locale';
process.env.Z_SESSION_USER_KEY = 'user';

// engine values
process.env.Z_OP_KEY = '@';

// http caching
process.env.Z_HTTP_CACHE_MAX_AGE = 86400;
process.env.Z_HTTP_CACHE_MAX_AGE_FINGERPRINT = 94670000;

// path values
process.env.Z_PATH_ENGINE = require('path').normalize(__dirname + '/');
process.env.Z_PATH_PROCESS_REPO = repo;
process.env.Z_PATH_PROCESS_PUBLIC = repo + 'public/';
process.env.Z_PATH_PROCESS_MARKUP = repo + 'markup/';
process.env.Z_PATH_PROCESS_MODULES = repo + 'modules/';
process.env.Z_PATH_PROCESS_COMPOSITION = repo + 'composition/';

// start engine
require('./lib/engine')(repo, port, user, key, production);
