
function insertOperations (module, callback) {

    if (module._vid == undefined) {
        return callback("The module is missing the _vid. Upsert this module version to obtain a version ID.");
    }

    var operations = module.operations;
    if (!operations || !operations.length) {
        return callback(null, []);
    }

    // build the INSERT VALUES string
    var vvCluster = M.orient.getClusterByClass("VModuleVersion");
    var opsStr = "";
    // TODO issue with query parging: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var i in operations) {
        opsStr += "(#" + vvCluster.id + ":" + module._vid + ", '" + operations[i].file + "', '" + operations[i]["function"] + "') , ";
    }
    // TODO hence the slice -2
    opsStr = opsStr.slice(0, -2);

    var command =
        "INSERT INTO VOperation (" +
            "module, " +
            "file, " +
            "method" +
        ") VALUES " +
            opsStr;

    M.orient.sqlCommand(command, callback);
};

function addCanPerform (mvid, miid, rid, operation, params, callback) {

    callback = callback || function() {};

    // find operation id for miid
    getOperationId(mvid, operation, function(err, id) {

        if (err) { return callback(err); }

        var vrCluster = M.orient.getClusterByClass("VRole");
        var voCluster = M.orient.getClusterByClass("VOperation");

        var rrid = "#" + vrCluster.id + ":" + rid;
        var orid = "#" + voCluster.id + ":" + id;

        var options = {
            "class" : "ECanPerform"
        };

        var hash = {
            miid: miid
        };
        if (params) {
            hash.params = params;
        }

        // first we add a Uses edge between the role and the version
        M.orient.createEdge(rrid, orid, hash, options, function(err, edgeDoc) {

            if (err) {
                return callback(err);
            }

            callback(null, M.orient.idFromRid(edgeDoc["@rid"]));
        });
    });
}

function getOperationId (mvid, name, callback) {

    var vrCluster = M.orient.getClusterByClass("VRole");
    var vmvCluster = M.orient.getClusterByClass("VModuleVersion");

    var mvrid = "#" + vmvCluster.id + ":" + mvid;

    var command =
        "SELECT @rid as id FROM VOperation " +
        "WHERE " +
            "method = '" + name + "' AND " +
            "module = '" + mvrid + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while finding operation '" + name + "' for module version: " + mvid + ". " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Could not find operation '" + name + "' for module version: " + mvid);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Coould not uniquely identify operation '" + name + "' for module version: " + mvid);
        }
        
        callback(null, M.orient.idFromRid(results[0].id));
    });
}

function getWithPermission (miid, method, roleId, callback) {
    
    var vuCluster = M.orient.getClusterByClass("VRole");

    if (!vuCluster) {
        return callback("Could not find the VUser cluster ID.");
    }
    
    var command =
        "SELECT " +
            "in.module.module.source AS source, " +
            "in.module.module.owner AS owner, " +
            "in.module.module.name AS name, " +
            "in.module.version AS version, " +
            "in.file AS file, " +
            "params " +
        "FROM " +
            "(TRAVERSE VRole.out FROM #" + vuCluster.id + ":" + roleId + ") " +
        "WHERE " +
            "@class = 'ECanPerform' AND " +
            "miid = '" + miid + "' AND " +
            "in.method = '" + method + "'";
    
    M.orient.sqlCommand(command, function (err, operation) {
        
        if (err) {
            return callback("An error occurred while retrieving the user's operation: " + err);
        }
        
        // if there is no result
        if (!operation || operation.length == 0) {
            return callback("Operation not found");
        }

        // if there are too many results
        if (operation.length > 1) {
            return callback("Could not uniquely determine the operation");
        }
        
        var operation = operation[0];

        // is the operation does not have the required fields or an error occurred while retrieving it
        if (!operation || !operation.file) {
            return callback("The operation object is not complete. Missing: operation.file");
        }
        
        callback(null, operation);
    });
    
}

exports.getWithPermission = getWithPermission;
exports.insertOperations = insertOperations;
exports.addCanPerform = addCanPerform;

