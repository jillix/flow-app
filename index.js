var Flow = require('flow');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var argv = require('yargs')
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

        argv._[0] = argv._[0] || '.';
        argv.repo = path.resolve(argv._[0]);

        if (fs.statSync(argv.repo)) {
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

    .usage('flow-app [options] [APP_REPO_PATH] [PORT]')
    .example('flow-app /usr/src/app 8000', "Start flow app node.")
    .example('flow-app -t secretToken /usr/src/app 8000', "Define a secret token for client sessions.")
    .example('flow-app -c /path/to/cert.pem -k /path/to/key.pem 8000', "Define SSL certificate")
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

    // flow app related configs
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
    public: config.workDir + '/public'
};

config.paths = config.paths ? Object.assign(defaultPaths, config.paths) : defaultPaths;

Flow(config, {
    mod: function loadModule (name, callback) {
        callback(null, require(name[0] === '/' ? this.config.paths.custom + name : name));
    },
    mic: function (name, callback) {
        callback(null, require(this.config.paths.composition + '/' + name + '.json'));
    }
}).load();
