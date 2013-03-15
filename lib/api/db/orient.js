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

module.exports = db;
