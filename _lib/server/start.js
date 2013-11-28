var forever = require('forever');
var config = require('./config');

function start () {
    forever.list('array', function (err, processes) {
        
        // stop all forever
        if (config === 'stop') {
            
                if (!processes) {
                    return console.log('no process to stop');
                }
                
                forever.stopAll();
                console.log('process stoped');
                
            return;
        }
        
        // stop on config errors
        if (typeof config === 'string') {
            return console.log(config);
        }
        
        if (processes) {
            return console.log('server already running');
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
        
        console.log('server is running in the background');
    });
}

exports.start = start;
