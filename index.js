#!/usr/bin/env node

var app = require('./lib/app');
var argv = require('yargs')

// entrypoint
.check(function (argv) {

    if (!argv._[0] || !argv._[1]) {
        return;
    }

    argv.config = argv._[1];
    argv.entrypoint = argv._[0];

    return true;
})

.usage('flow-app [ENTRYPOINT] [CONFIG]')
.example('flow-app myEntrypoint /usr/flow/config.json', 'Start entrypoint, defined in config file.')
.help('h')
.alias('h', 'help')
.strict()
.argv;

app(argv.entrypoint, argv.config);
