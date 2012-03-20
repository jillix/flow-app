var Db = require("orientdb").Db,
    Server = require("orientdb").Server;

var server = new Server(CONFIG.orient.server),
    db = new Db(CONFIG.orient.db.database_name, server, CONFIG.orient.db);


exports.getOperation = function(operationId, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        var vopClusterId = -1;

        for (var i in result.clusters) {

            if (result.clusters[i].name === "voperation") {
                vopClusterId = result.clusters[i].id;
            }
        }

        if (vopClusterId < 0) { return callback("Could not find the VOperation cluster ID."); }

        var command = "SELECT module, file, method FROM #" + vopClusterId + ":" + operationId;
        sql(command, callback);
    });
};


exports.getUserOperation = function(operationId, userId, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
        var vopClusterId = -1,
            vuClusterId = -1;

        for (var i in result.clusters) {

            if (result.clusters[i].name === "voperation") {
                vopClusterId = result.clusters[i].id;
                continue;
            }
            if (result.clusters[i].name === "vuser") {
                vuClusterId = result.clusters[i].id;
                continue;
            }
        }

        if (vopClusterId < 0) { return callback("Could not find the VOperation cluster ID."); }
        if (vuClusterId < 0) { return callback("Could not find the VOperation cluster ID."); }

        var command = "SELECT module, file, method, in[@class = 'ECanPerform'].params AS params FROM (TRAVERSE * FROM #" + vuClusterId + ":" + userId +" WHERE $depth <= 4) WHERE @rid = #" + vopClusterId + ":" + operationId;
        
        sql(command, callback);
    });
};


exports.getModule = function(moduleId, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO get the VUser cluster ID from the db.open result
    var command = "SELECT name AS module, dir FROM (TRAVERSE out FROM #7:" + userId + " WHERE $depth <= 4) WHERE @class = 'VModule' AND name = '" + moduleId + "'";
    sql(command, callback);
};


exports.getComponent = function(compId, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO get the VUser cluster ID from the db.open result

    // TODO adapt to the new traverse syntax
    var command = "select name as module,dir,in[@class = 'EHasAccessTo'].config as config,"+
     	"in[@class = 'EHasAccessTo'].html as html,"+
     	"in[@class = 'EHasAccessTo'].css as css "+
     	"from VModule where in traverse(5,8) (@rid = #7:"+ userId +" ) "+
     	"and in traverse(2,2) (@rid = #11:"+ compId +")";

    sql(command, callback);
};


function sql(command, callback) {

    db.command(command, function(err, results) {

        if (err) { return callback(err); }

        var result = null;

        if (results.length != 0) {
            result = eval("({" + results[0].content + "})");
        }

        callback(undefined, result);
    });
}

