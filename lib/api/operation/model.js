var colMiids = M.db.collection('miids');

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

function addCanPerform (mvid, data, rid, operation, params, callback) {

    callback = callback || function() {};

    // find operation id for mvid
    // the data is only used for error reporting
    getOperationId(mvid, operation, data, function(err, id) {

        if (err) { return callback(err); }

        var vrCluster = M.orient.getClusterByClass("VRole");
        var voCluster = M.orient.getClusterByClass("VOperation");

        var rrid = "#" + vrCluster.id + ":" + rid;
        var orid = "#" + voCluster.id + ":" + id;

        var options = {
            "class" : "ECanPerform"
        };

        var hash = {
            miid: data.miid
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

function getOperationId (mvid, name, data, callback) {

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
            return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, 'getOperationId', err.toString()));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback(M.error(M.error.API_OPR_NOT_FOUND, name, data.sonv + ' (' + data.miid + ')'));
        }

        // if there are too many results
        if (results.length > 1) {
            return callback(M.error(M.error.DB_ORIENT_OPERATION_NOT_UNIQUE_PERMISSION, name, mvid));
        }
        
        callback(null, M.orient.idFromRid(results[0].id));
    });
}

// TODO get module path
function getWithPermission (miid, method, roleId, callback) {
    
    var query = {
        roles: parseInt(roleId, 10),
        application: M.config.app.id,
        miid: miid,
        'operations.method': method
    };

    var fields = {
        _id: 0,
        file: 1,
        'operations.$.params': 1,
        module: 1
    };
    
    colMiids.findOne(query, {fields: fields}, function (err, operation) {
        
        if (err) {
            return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, 'getWithPermission', err.toString()));
        }

        if (!operation) { 
            return callback(M.error(M.error.API_OPR_NOT_FOUND_PERMISSION, method, miid, roleId));
        }

        if (!operation.file) {
            return callback(M.error(M.error.DB_ORIENT_OPERATION_NOT_COMPLETE, method, miid, roleId));
        }

        operation = {
            file: operation.file,
            params: operation.operations[0].params
        }
        console.log(operation);
        callback(null, operation);
    });
}


exports.getWithPermission = getWithPermission;
exports.insertOperations = insertOperations;
exports.addCanPerform = addCanPerform;

