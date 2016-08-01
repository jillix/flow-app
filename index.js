#!/usr/bin/env node

(require('./lib/app'))(require('yargs')

// global config option
.option('config', {
    alias: 'c',
    describe: 'Define a path to a project config file.',
    default: './'
})

// check command and args
.check(function (argv) {

    switch (argv._[0]) {
        case 'install':

            // git repo
            // TODO validate git url
            if (!argv._[1]) {
                throw new Error('Missing git url.');
            }

            argv.git_url = argv._[1];

            // install dir value
            argv.install_dir = argv._[2] || './';
            break;

        case 'start':

            // start a specific or all entrypoints
            argv.start = argv._[1] || true;

            if (argv._[2]) {
                argv.infrastructure = argv._[2]; 
            }

            // TODO restart on mic change
            break;

        case 'stop':
            // stop all or specific entrypoints
            argv.stop = argv._[1] || true; 
            break;

        default:
            return;
    }

    return true;
})

// describe commands
.command('install <git> [install_dir]', 'Install a project for a git url.')
.command('start [entrypoint] [start_config]', 'Start project or a specific entrypoint.')
.command('stop [entrypoint]', 'Stop project or a specific entrypoint.')

// help option
.help('h')
.alias('h', 'help')

// demand at least one command
.demand(1)
.strict()
.argv);

