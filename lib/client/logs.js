var bunyan = require('bunyan');
var logger;
if (bunyan) {
    logger = bunyan.createLogger({
        name: engine.repo ? engine.repo.split('/').slice(-2, -1)[0] : 'client',
        serializers: bunyan.stdSerializers
    });
}

module.exports = function (level, data, message) {
    
    if (arguments.length < 2) {
        return;
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
        
        return data;
    }
    
    // create a child logger for every instance
    if (logger && !this._log) {
        this._log = logger.child({
            module: this._module || 'engine',
            instance: this._name || 'engine'
        });
    } 
    
    if (!this._log[level]) {
        return this._log.error(new Error('Invalid log level '+ level));
    }
    
    this._log[level](data, message);
    
    return data;
};
