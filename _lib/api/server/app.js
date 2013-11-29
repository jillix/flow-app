function getFromHost (host, callback) {
    var self = this;
    
    // return if callback is not a function
    if (typeof callback !== 'function') {
        return;
    }
    
    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }
    
    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }

    if (typeof fields === 'function') {
        callback = fields;
        fields = null;
    }
    
    self.collection.findOne({domains:host},{fields: {host: 1}}, function (err, data) {
        
        if (err) {
            return callback(err);
        }

        if (!data) {
            return callback(self.error(self.error.API_APP_NOT_FOUND, host));
        }

        callback(null, data);
    });
}

exports.getFromHost = getFromHost;
