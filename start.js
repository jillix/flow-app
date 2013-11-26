#!/usr/bin/env node

var forever = require('forever');
var argv = require('optimist').argv;
var config = require('./_lib/proxy/api').config;

// stop on config errors
if (typeof config === 'string') {
    return console.log(config);
}

// start proxy as a deamon
if (config.deamon) {
    
    forever.startDaemon('./lib/proxy/server.js', {
        "max"           : config.attempts,
        "minUptime"     : config.minUptime,
        "spinSleepTime" : config.spinSleepTime,
        "silent"        : config.silent,
        "logFile"       : config.log
    });
    
    return;
}

// start the server directly
require('./lib/proxy/server.js');
