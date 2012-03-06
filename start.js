/**
 * function start (options)
 *
 * param @options {Object} Options to start a daemon
 * option {
 *  script:            {String} [optional/default: 'server.js'] script file to start
 *      parameter:     {Array}  [optional] parameter to pass to the script
 *      maxAttempts:   {Number} [optional/default: 10] max restart attempts
 *      minUptime:     {Number} [optional/default: 2000] how long the app has to be up (minimum time)
 *      spinSleepTime: {Number} [optional/default: 1000] time intervall of restart
 * }
 *
 * param @mail {String} specify notification email adress
 * 
 */

var config = require("./config");
var MonoServer = require("./core/server").Server;

var server = new MonoServer(config);
server.start();

