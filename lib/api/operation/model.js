
function insertOperations (module, callback) {

    if (module._vid == undefined) {
        // TODO replace with M.error
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

    var roleClassName = 'VRole';
    var vrCluster = M.orient.getClusterByClass(roleClassName);

    if (!vrCluster) {
        return callback(M.error(M.error.DB_ORIENT_NO_CLUSTER_FOR_CLASS, roleClassName));
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
            "(TRAVERSE VRole.out FROM #" + vrCluster.id + ":" + roleId + ") " +
        "WHERE " +
            "@class = 'ECanPerform' AND " +
            "miid = '" + miid + "' AND " +
            "in.method = '" + method + "'";

    M.orient.sqlCommand(command, function (err, operation) {

        if (err) {
            return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, 'getWithPermission', err.toString()));
        }

        // if there is no result
        if (!operation || operation.length == 0) {
            return callback(M.error(M.error.API_OPR_NOT_FOUND, method, miid, roleId));
        }

        // if there are too many results
        if (operation.length > 1) {
            return callback(M.error(M.error.DB_ORIENT_OPERATION_NOT_UNIQUE, method, miid, roleId));
        }

        var operation = operation[0];

        // if the operation does not have the required fields
        if (!operation || !operation.file) {
            return callback(M.error(M.error.DB_ORIENT_OPERATION_NOT_COMPLETE, method, miid, roleId));
        }

        callback(null, operation);
    });
}


exports.getWithPermission = getWithPermission;
exports.insertOperations = insertOperations;
exports.addCanPerform = addCanPerform;

