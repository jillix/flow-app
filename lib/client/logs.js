var bunyan = require('bunyan');
var logger;
if (bunyan) {
    logger = bunyan.createLogger({
        name: engine.repo ?  engine.repo.split('/').slice(-2, -1) : 'client',
        streams: [
            {
              level: 'info',
              stream: process.stdout
            },
            {
              level: 'debug',
              stream: process.stdout
            },
            {
              level: 'error',
              stream: process.stdout
            }
        ],
        serializers: bunyan.stdSerializers
    });
}

// TODO
module.exports = function (level, data, message, callback) {
    
    if (arguments.length < 2) {
        return;
    }
    
    // esure callback
    callback = [].slice.apply(arguments).pop();
    if (typeof callback !== 'function') {
        callback = function () {};
    }
    
    if (typeof data === 'string') {
        message = data;
        data = {};
    }
    
    if (typeof message !== 'string') {
        message = data.message || data.msg || '';
    }
    
    // client console logs
    if (engine.client) {
        
        if (message) {
            data.level = level;
            data.msg = message;
        }
        
        console.log(data);
        
        return callback();
    }
    
    if (bunyan && !this._log) {
        this._log = logger.child({
            module: this._module || 'engine',
            instance: this._name || 'engine'
        });
    } 
    
    var log = this._log;
    
    // server logs
    switch (level) {
      case 'F':
        log.fatal(data, message);
        break;
      case 'E':
        log.error(data, message);
        break;
      case 'W':
        log.warn(data, message);
        break;
      case 'I':
        log.info(data, message);
        break;
      case 'D':
        log.debug(data, message);
        break;
      case 'T':
        log.trace(data, message);
        break;
      default:
        log.error('Log level "' + level + '" is not a valid level.');
    }
    
    callback();
};
