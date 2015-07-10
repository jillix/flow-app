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
    
    if (typeof message !== 'string' && typeof message !== 'number') {
        message = data.message || data.msg || '';
    }
    
    // server logs
    switch (level) {
      case 'F':
        level = 'fatal';
        break;
      case 'E':
        level = 'error';
        break;
      case 'W':
        level = 'warn';
        break;
      case 'I':
        level = 'info';
        break;
      case 'D':
        level = 'debug';
        break;
      case 'T':
        level = 'trace';
        break;
    }
    
    // client console logs
    if (engine.client) {
        
        if (message) {
            data.msg = message;
        }
        
        data.level = level;
        
        console.log(data);
        
        return callback();
    }
    
    // create a child logger for every instance
    if (logger && !this._log) {
        this._log = logger.child({
            module: this._module || 'engine',
            instance: this._name || 'engine'
        });
    } 
    
    if (!this._log[level]) {
        return callback();
    }
    
    this._log[level](data, message);
    
    
    callback();
};
