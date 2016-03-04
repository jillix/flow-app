#!/usr/bin/env node

var Flow = require('flow');
var fs = require('fs');
var path = require('path');
var argv = require('yargs')

    // check if app path exists
    .check(function (argv) {
        argv._[0] = argv._[0] || '.';
        argv.repo = path.resolve(argv._[0]);

        if (fs.statSync(argv.repo)) {
            return true;
        }
    })
    .usage('flow-app <APP_REPO_PATH>')
    .example('flow-app path/to/app', 'Start an app')
    .help('h')
    .alias('h', 'help')
    .strict()
    .argv;

Flow({
    mod: function loadModule (name, callback) {
        callback(null, require(name[0] === '/' ? argv.repo + '/app_modules' + name : name));
    },
    mic: function (name, callback) {
        callback(null, require(argv.repo + '/composition/' + name + '.json'));
    }
})();
