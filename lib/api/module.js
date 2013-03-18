function getConfig (appId, miid, userId, callback) {

    var vuCluster = M.orient.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "in.module.source AS source, " +
            "in.module.owner AS owner, " +
            "in.module.name AS name, " +
            "in.version AS version, " +
            "config " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'EUsesInstanceOf' AND " +
            "miid = '" + miid + "'";

    M.orient.sqlCommand(command, function(err, results) {

        // error checks
        if (err) {
            console.log(err);
            return callback("An error occured while retrieving the module '" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module instance (app: " + appId + "): " + miid);
        }

        if (results.length > 1) {
            return callback("There can be only one module (app: " + appId + "): " + miid + ". Found: " + results.length);
        }

        var module = results[0];

        if (!module.source || !module.owner || !module.name || !module.version) {
            return callback("Incomplete module object. Source, owner, name and, version must all be present: " + JSON.stringify(module));
        }

        callback(null, module);
    });
}

function getFile (source, owner, name, userId, callback) {

    var vuCluster = M.orient.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "module.source AS source, " +
            "module.owner AS owner, " +
            "module.name AS name, " +
            "module.latest AS latest " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModuleVersion' AND " +
            "module.source = '" + source + "' AND " +
            "module.owner = '" + owner + "' AND " +
            "module.name = '" + name + "'";

    M.orient.sqlCommand(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + source + "/" + owner + "/" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module: " + source + "/" + owner + "/" + name);
        }

        var module = results[0];
        callback(null, module);
    });
}

exports.getConfig = getConfig;
exports.getFile = getFile;
