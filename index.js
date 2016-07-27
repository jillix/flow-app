#!/usr/bin/env node

var app = require('./lib/app');
var argv = require('yargs')

// entrypoint
.check(function (argv) {

    if (!argv._[0] || !argv._[1] || !argv._[2]) {
        return;
    }

    argv.entrypoint = argv._[0];
    argv.infrastructure = argv._[1]
    argv.config = argv._[2];

    return true;
})

.usage('flow-app [ENTRYPOINT] [INFSTR_CONFIG] [CONFIG_FILE]')
.example('flow-app myEntrypoint nodejs-local /usr/flow/config.json', 'Start "myEntrypoint" with "nodejs-local" infrastructure, defined in config file.')
.help('h')
.alias('h', 'help')
.strict()
.argv;

app(argv.entrypoint, argv.infrastructure, argv.config);
