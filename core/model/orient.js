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


exports.getModule = function(moduleId, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO get the VUser cluster ID from the db.open result
    var command = "SELECT name AS module, dir FROM (TRAVERSE out FROM #7:" + userId + " WHERE $depth <= 4) WHERE @class = 'VModule' AND name = '" + moduleId + "'";
    sql(command, callback);
};


function sql(command, callback) {

    db.command(command, function(err, results) {

        if (err) { return calback(err); }

        var result = null;

        if (results.length != 0) {
            result = eval("({" + results[0].content + "})");
        }

        callback(undefined, result);
    });
}

