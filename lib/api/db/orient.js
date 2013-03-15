var orient = require("orientdb");
var server = new orient.Server(M.config.orient.server);
var db = new orient.GraphDb(M.config.orient.db.database_name, server, M.config.orient.db);
var open = false;

db.connect = function(callback) {
    
    if (open) {
        return callback(null, db);
    }
    
    db.open(function(err) {

        if (err) {
            return callback(err);
        }
        
        open = true;
        callback(null, db);
    });
}

db.sqlSelectFields = function (fields, from) {
    
    var select = '*';
    
    if (typeof fields === 'object' && fields.constructor.name === 'Object') {
        
        select = '';
        
        for (var field in fields) {
            if (fields[field]) {
                
                if (from) {
                    select += from + '.' + field + ' AS ' + field + ', ';
                } else {
                    select += field + ', ';
                }
            }
        }
        
        select = select.replace(/,\s$/, '');
    }
    
    return select;
}

db.sqlCommand = function (command, callback) {
    
    db.connect(function (err, db) {
        
        if (err) {
            return callback(err);
        }
        
        if (M.config.log.orientQueries || M.config.logLevel === "verbose") {
            console.log(command);
        }
        
        db.command(command, callback);
    });
}

module.exports = db;
