function getWithPermission (miid, method, userId, callback) {
    
    var vuCluster = M.orient.getClusterByClass("VUser");

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
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
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
