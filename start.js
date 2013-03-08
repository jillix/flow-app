require('forever').startDaemon('./lib/proxy/server.js', {
    logFile: __dirname + '/tmp/log.txt'
});
