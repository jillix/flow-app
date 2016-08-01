#!/usr/bin/env node

const argv = require('yargs')

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

            argv.command = './lib/install';
            argv.args = [
                // git url
                argv._[1],
                // install dir
                argv._[2] || './'
            ];
            break;

        case 'start':

            argv.command = './lib/entrypoint';
            argv.args = [
                // entrypoint (true = all entrypioints)
                argv._[1] || true,
                // infrastructure config name
                argv._[2],
                // config file
                argv.config || './'
            ];
            break;

        case 'stop':

            argv.command = './lib/stop';
            argv.args = [
                // entrypoint to stop (true = all entrypoints)
                argv._[1] || true
            ];
            break;

        default:
            throw new Error('Invalid command.');
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
.argv;

// call command
(require(argv.command)).apply(this, argv.args);

