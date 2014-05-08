var config = require('./config');
var forever = require('forever');

forever.list('array', function (err, processes) {
        
    // stop all forever
    if (config === 'stop') {

        if (!processes) {
            return console.log('no proxy processes found to stop');
        }

        forever.stopAll();
        console.log('proxy stoped');
            
        return;
    }
    
    // stop on config errors
    if (typeof config === 'string') {
        return console.log(config);
    }
    
    if (processes) {
        return console.log('proxy already listening');
    }
    
    // start proxy as a deamon
    forever.startDaemon(config.paths.PROXY_SERVER, {
        'max'           : config.attempts,
        'minUptime'     : config.minUptime,
        'spinSleepTime' : config.spinSleepTime,
        'silent'        : config.silent,
        'verbose'       : config.verbose,
        'logFile'       : config.log,
        'options'       : ['--host', config.host, '--port', config.port]
    });
    
    console.log('proxy is listening to:', config.host + ':' + config.port);
});
