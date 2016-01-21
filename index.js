#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

// parse cli arguments
var argv = require('yargs')
    .option('d', {
        alias: 'debug',
        default: false,
        type: 'boolean',
        describe: 'Start engine in debug mode.'
    })
    .option('l', {
        alias: 'logLevel',
        default: 'error',
        type: 'string',
        choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
        describe: 'Set log level.'
    })
    .option('t', {
        alias: 'token',
        type: 'string',
        describe: 'Set secret tocken for client sessions.'
    })
    .option('c', {
        alias: 'sslCert',
        type: 'string',
        demand: true,
        requiresArg: 'k',
        describe: 'Path to the SSL certificate file.'
    })
    .option('k', {
        alias: 'sslKey',
        type: 'string',
        demand: true,
        requiresArg: 'c',
        describe: 'Path to the SSL key file.'
    })

    // check if repo path exists
    .check(function (argv) {

        if (typeof argv._[0] === 'string') {
            argv.repo = path.resolve(argv._[0]);

            if (fs.statSync(argv.repo)) {
                return true;
            }
        }
    })

    // check if port is a number
    .check(function (argv) {

        if (argv._[1]) {
            argv.port = typeof argv._[1] === 'number' ? argv._[1] : parseInt(argv._[1].replace(/[^0-9]/, ''));

            if (argv.port) {
                return true;
            }

        // set default port
        } else {
            argv.port = 8000;
            return true;
        }
    })

    // check if ssl certificates exists
    .check(function (argv) {

        argv.ssl = {};

        // check if ssl certificate exists
        if (typeof argv.c === 'string') {
            argv.ssl.cert = fs.readFileSync(path.resolve(argv.c));
        }

        // check if ssl key file exists
        if (typeof argv.k === 'string') {
            argv.ssl.key = fs.readFileSync(path.resolve(argv.k));
        }

        if (argv.ssl.cert && argv.ssl.key) {
            return true;
        }
    })

    // set default log level
    .check(function (argv) {

        if (!argv.l && argv.d) {
            argv.l = argv.logLevel = 'debug';
        }

        return true;
    })

    .usage('engine [options] [APP_REPO_PATH] [PORT]')
    .example('engine /usr/src/app 8000', "Start engine in production mode.")
    .example('engine -d /usr/src/app 8000', "Start engine in debug mode.")
    .example('engine -t secretToken /usr/src/app 8000', "Define a secret token for client sessions.")
    .example('engine -c /path/to/cert.pem -k /path/to/key.pem 8000', "Define SSL certificate")
    .help('h')
    .alias('h', 'help')
    .strict()
    .argv;

// create runtime config from app package
var config = require(argv.repo + '/package.json');

// set working directory
config.workDir = argv.repo;

// set port
config.port = argv.port;

// check if entrypoints are in the config
if (typeof config.entrypoints !== 'object') {
    throw new Error('No entrypoints defined in package.');
}

// log level
config.logLevel = argv.l;

// debug mode
config.production = argv.d ? false : true;

// ssl config
config.ssl = argv.ssl || config.ssl || {};

// session config
var defaultSession = {
    cookieName: 'SES', // cookie name dictates the key name added to the request object
    requestKey: 'session', // requestKey overrides cookieName for the key name added to the request object
    secret: argv.token || crypto.randomBytes(64).toString('hex'), // should be a large unguessable string
    duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
    activeDuration: 1000 * 60 * 5, // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
    cookie: {
        ephemeral: false, // when true, cookie expires when the browser closes
        httpOnly: true, // when true, cookie is not accessible from javascript
        secure: false // when true, cookie will only be sent over SSL. use key 'secureProxy' instead if you handle SSL not in your node process
    },

    // engine related configs
    wildcard: '*',
    role: 'role',
    user: 'user',
    locale: 'locale'
};
config.session = config.session ? Object.assign(defaultSession, config.session) : defaultSession;

// app paths
var defaultPaths = {
    composition: config.workDir + '/composition',
    modules: config.workDir + '/node_modules',
    custom: config.workDir + '/app_modules',
    public: config.workDir + '/public',
    markup: config.workDir + '/markup',
};
config.paths = config.paths ? Object.assign(defaultPaths, config.paths) : defaultPaths;

// static headers
config.static = {
    maxAge: 86400,
    fpMaxAge: 94670000
};

// core instance name
config.flow = {
    coreInstance: '@'
};

// start server
require('./lib/server')(config);
