function getFromId (id, fields, callback) {
    
    if (typeof id !== "string" && id.length != 32) {
        return callback("Invalid application id: " + id);
    }
    
    if (typeof fields === 'function') {
        callback = fields;
    }
    
    var command = 'SELECT ' + M.orient.sqlSelectFields(fields) + ' FROM VApplication WHERE id = "' + id + '"';
    
    M.orient.sqlCommand(command, function (err, data) {
        callback(err, data && data.length > 0 ? data[0] : undefined);
    });
}

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

exports.getFromId = getFromId;
exports.getFromHost = getFromHost;
