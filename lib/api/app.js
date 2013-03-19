function getFromHost (host, fields, callback) {
    
    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }
    
    // prevent slq attacks
    host = host.replace(/[^0-9a-z\.]/gi, '');
    
    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }
    
    if (typeof fields === 'function') {
        callback = fields;
    }
    
    var command = 'SELECT ' + M.orient.sqlSelectFields(fields, 'application') + ' FROM VDomain WHERE name = "' + host + '"';
    
    M.orient.sqlCommand(command, function (err, data) {
        callback(err, data && data.length > 0 ? data[0] : undefined);
    });
}

exports.getFromHost = getFromHost;
