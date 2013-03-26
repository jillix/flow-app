function getFromHost (host, fields, callback) {
    
    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }
    
    // prevent sql injection attacks
    host = host.replace(/[^0-9a-z\.]/gi, '');
    
    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }
    
    if (typeof fields === 'function') {
        callback = fields;
        fields = null;
    }
    
    var command = 'SELECT ' + M.orient.sqlSelectFields(fields, 'application') + ' FROM VDomain WHERE name = "' + host + '"';
    
    M.orient.sqlCommand(command, function (err, data) {

        if (err) {
            return callback(err);
        }

        if (!data || !data.length) {
            return callback(M.error(M.error.APP_NOT_FOUND, host));
        }

        if (data.length > 1) {
            return callback(M.error(M.error.MULTIPLE_APPS_FOUND, host));
        }
        
        callback(null, data[0]);
    });
}

exports.getFromHost = getFromHost;
