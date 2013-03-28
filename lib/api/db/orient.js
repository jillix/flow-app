var orient = require("orientdb");
var server = new orient.Server(M.config.orient.server);
var db = new orient.GraphDb(M.config.orient.db.database_name, server, M.config.orient.db);
var open = false;
var callbacks = [];

db.connect = function(callback) {
    
    if (open) {
        return callback(null, db);
    }
    
    if (open === null) {
        return callbacks.push(callback);
    }
    
    open = null;
    callbacks.push(callback);
    
    db.open(function(err) {

        if (err) {
            
            for (var i = 0, l = callbacks.length; i < l; ++i) {
                callbacks[i](err);
            }
            callbacks = [];
            return;
        }
        
        open = true;
        
        for (var i = 0, l = callbacks.length; i < l; ++i) {
            callbacks[i](null, db);
        }
        callbacks = [];
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

/*
 * Given an Orient RID, this will return the ID in the cluster or null if the 
 * RID is not in the format: #x:y
 */
db.idFromRid = function (rid) {
    if (typeof rid === "string") {
        var number = parseInt(rid.split(":")[1]);
        if (!isNaN(number)) {
            return number;
        }
    }
    return null;
}

/*
 * Given a class name and an ID, 
 */
db.ridFromId = function (className, id) {

    var cluster = M.orient.getClusterByClass(className);

    if (!cluster || isNaN(id)) {
        return null;
    }

    return "#" + cluster.id + ":" + id;
}


module.exports = db;
