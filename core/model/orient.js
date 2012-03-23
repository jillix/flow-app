var Db = require("orientdb").Db,
    Server = require("orientdb").Server;

var server = new Server(CONFIG.orient.server),
    db = new Db(CONFIG.orient.db.database_name, server, CONFIG.orient.db);


exports.getComponents = function(callback) {

    var command = "SELECT FROM VComponent";
    sql(command, callback);
};


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
        var vopClusterId = db.getClusterIdByClass("VOperation"),
            vuClusterId = db.getClusterIdByClass("VUser");

        if (vopClusterId < 0) { return callback("Could not find the VOperation cluster ID."); }
        if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

        var command = "SELECT module, file, method, in[@class = 'ECanPerform'].params AS params FROM (TRAVERSE * FROM #" + vuClusterId + ":" + userId +" WHERE $depth <= 4) WHERE @rid = #" + vopClusterId + ":" + operationId;

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the user's operation: " + err);
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("Operation not found");
            }

            // if there are too many results
            if (results.length > 1) {
                return callback("Could not uniquely determine the operation");
            }

            var operation = results[0];

            // is the operation does not have the required fields or an error occurred while retrieving it
            if (!operation.module || !operation.file || !operation.method) {
                var detail = "Missing: " + (operation.module ? (operation.file ? "operation.method": "operation.file") : "operation.module");
                return callback("The operation object is not complete. " + detail);
            }

            // if the operation has parameters, parse them as JSON
            if (operation.params) {
                operation.params = JSON.parse(operation.params);
            }

            callback(null, operation);
        });
    });
};


exports.getModule = function(moduleId, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
    var vopClusterId = db.getClusterIdByClass("VOperation"),
        vuClusterId = db.getClusterIdByClass("VUser");

    if (vopClusterId < 0) { return callback("Could not find the VOperation cluster ID."); }
    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    var command = "SELECT name AS module, dir FROM (TRAVERSE out FROM #" + vuClusterId + ":" + userId + " WHERE $depth <= 4) WHERE @class = 'VModule' AND name = '" + moduleId + "'";
    sql(command, callback);
};


exports.getComponent = function(compId, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation

    var vcClusterId = db.getClusterIdByClass("VComponent"),
        vuClusterId = db.getClusterIdByClass("VUser");

    if (vcClusterId < 0) { return callback("Could not find the VComponent cluster ID."); }
    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    // TODO adapt to the new traverse syntax
    var command = "select name as module,dir,in[@class = 'EHasAccessTo'].config as config,"+
     	"in[@class = 'EHasAccessTo'].html as html,"+
     	"in[@class = 'EHasAccessTo'].css as css "+
     	"from VModule where in traverse(5,8) (@rid = #" + vuClusterId  + ":"+ userId +" ) "+
     	"and in traverse(2,2) (@rid = #" + vcClusterId + ":"+ compId +")";

    sql(command, callback);
};


function sql(command, callback) {
    db.command(command, callback);
}

