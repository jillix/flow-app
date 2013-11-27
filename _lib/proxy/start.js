var forever = require('forever');
var config = require('./config');

function start () {
    
    // stop all forever
    if (config === 'stop') {
        
        forever.list('array', function (err, processes) {
            if (!processes) {
                return console.log('No process to stop');
            }
            
            forever.stopAll();
            console.log('Processes stoped');
        });
        
        return;
    }
    
    // stop on config errors
    if (typeof config === 'string') {
        return console.log(config);
    }
    
    // start the server directly
    if (config.dev) {
        return require(config.paths.PROXY_SERVER);
    }
    
    // start proxy as a deamon
    forever.startDaemon(config.paths.PROXY_SERVER, {
        "max"           : config.attempts,
        "minUptime"     : config.minUptime,
        "spinSleepTime" : config.spinSleepTime,
        "silent"        : config.silent,
        "logFile"       : config.log
    });
}

exports.start = start;
