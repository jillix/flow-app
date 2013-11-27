// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
    value: function(){
        function ClonedObject(){}
        ClonedObject.prototype = this;
        return new ClonedObject();
    }
});

var argv = require('optimist');
var config = require('./config');
var api_utils = require('../api/utils');
var api_cache = require('../api/cache');

module.exports = {
    config: config,
    apps: api_cache(),
    proxy: {
        pipe: function (hostHeader, socket, buffer, ws) {
        
            // the host of an application is the ip address where the application runs
            var appSocket = net.connect(ws ? (M.cache.apps.cache[hostHeader].wsPort || 8888) : M.cache.apps.cache[hostHeader].port, M.cache.apps.cache[hostHeader].host);
            appSocket.setKeepAlive(true);
            appSocket.on('error', function (err) {
                
                M.cache.apps.rm(hostHeader);
                send(socket, 500, M.error.APP_SOCKET_RELOAD_MESSAGE);
            });
            
            // down stream
            appSocket.pipe(socket);
            // up stream
            socket.pipe(appSocket);
            
            appSocket.write(buffer);
            
            socket.resume();
        },
        send: function (socket, status, msg) {
            
            socket.end(
                'HTTP/1.1 ' + status + '\r\n' +
                'Date: ' + new Date().toString() + '\r\n' +
                'Server: Mono Web Server\r\n' +
                'Content-Length: ' + msg.length + '\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                '\r\n' + msg
            );
        },
        killEmAll: function (err, cache) {
            for (var host in cache.cache) {
                
                if (cache.cache[host] && cache.cache[host].pid) {
                    process.kill(cache.cache[host].pid);
                }
            }
            
            if (err) {
                console.error(err.message);
                console.error(err.stack);
                return process.exit(1);
            }
            
            process.exit();
        }
    },
    spawner: {}
};

/*
// pahts
var MONO_ROOT = __dirname;
var paths = {};
paths.MONO_ROOT = MONO_ROOT;
paths.CONFIG_ROOT = MONO_ROOT + 'conf/';
paths.LIB_ROOT = paths.MONO_ROOT + 'lib/';
paths.API_ROOT = paths.MONO_ROOT + 'lib/api/';
paths.MODULE_ROOT = paths.MONO_ROOT + 'modules/';
paths.MODULE_DESCRIPTOR_NAME = 'mono.json';
paths.APPLICATION_ROOT = paths.MONO_ROOT + 'apps/';
paths.APPLICATION_DESCRIPTOR_NAME = 'application.json';
paths.APPLICATION_MODULE_DIR_NAME = 'mono_modules';
*/

// check log level
// One of: none, error, warning, info, debug, verbose
/*if (!config.logLevel) {
    config.logLevel = "error";
} else {
    switch (config.logLevel) {
        case "none":
        case "error":
        case "warning":
        case "info":
        case "debug":
        case "verbose":
            break;
        default:
            throw new Error(config.logLevel + " is not a supported log level.");
    }
}*/
