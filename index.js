#!/usr/bin/env node

var Flow = require('flow');
var fs = require('fs');
var path = require('path');
var argv = require('yargs')

// check init event exists
.check(function (argv) {

    if (typeof argv._[1] !== 'string') {
        return;
    }

    argv.event = argv._[1];
    return true;
})

// check if app path exists
.check(function (argv) {
    argv._[0] = argv._[0] || '.';
    argv.repo = path.resolve(argv._[0]);

    if (fs.statSync(argv.repo)) {

        // load module instance composition (MIC)
        argv.mic = function (name, callback) {
            callback(null, require(argv.repo + '/composition/' + name + '.json'));
        };

        // load module
        argv.mod = function (name, callback) {
            callback(null, require(name[0] === '/' ? argv.repo + '/app_modules' + name : name));
        };

        return true;
    }
})

.usage('flow-app <APP_REPO_PATH> <FLOW_EVENT>')
.example('flow-app path/to/app http_server/start', 'Start a http server.')
.help('h')
.alias('h', 'help')
.strict()
.argv;

// emit init flow event
var stream = Flow(argv.event, argv);
stream.on('error', console.log.bind(console));
stream.end(true);
