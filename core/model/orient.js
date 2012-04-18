var orient = require("orientdb"),
    Db = orient.Db,
    Server = orient.Server;

var server = new Server(CONFIG.orient.server),
    db = new Db(CONFIG.orient.db.database_name, server, CONFIG.orient.db);


exports.getUserOperation = function(module, method, userId, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
        var vuClusterId = db.getClusterIdByClass("VUser");

        if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

        var command =
            "SELECT " +
                "file, " +
                "in[@class = 'ECanPerform'].params AS params " +
            "FROM " +
                "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, ECanPerform.in FROM #" + vuClusterId + ":" + userId + ") " +
            "WHERE " +
                "@class = 'VOperation' AND " +
                "module = '" + module + "' AND " +
                "method = '" + method + "'";

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
            if (!operation || !operation.file) {
                return callback("The operation object is not complete. Missing: operation.file");
            }

            // if the operation has parameters, parse them as JSON
            if (operation.params) {
                operation.params = JSON.parse(operation.params);
            }

            callback(null, operation);
        });
    });
};


exports.getModuleFile = function(ownerName, moduleName, userId, callback) {

    getModule(ownerName, moduleName, userId, false, callback);

};


exports.getModuleConfig = function(ownerName, moduleName, userId, callback) {

    getModule(ownerName, moduleName, userId, true, callback);

};


function getModule(ownerName, moduleName, userId, withConfig, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
    var vuClusterId = db.getClusterIdByClass("VUser");

    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    var configFields = !withConfig ? "" :
        (", " +
        "in[@class = 'EHasAccessTo'].config AS config, " +
        "in[@class = 'EHasAccessTo'].html AS html, " +
        "in[@class = 'EHasAccessTo'].css AS css "
        );

    var command =
        "SELECT " +
            "dir " + configFields +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuClusterId + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModule' AND " +
            "name = '" + moduleName + "' AND " +
            "owner = '" + ownerName + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + ownerName + "/" + moduleName + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module: " + ownerName + "/" + moduleName);
        }

        if (results.length > 1) {
            return callback("There can be only one module: " + ownerName + "/" + moduleName + ". Found: " + results.length);
        }

        var module = results[0];
        callback(null, module);
    });
}


this.getDomainPublicUser = function(domain, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        var command = "SELECT publicUser FROM VApplication WHERE name = 'mono.ch'";

        sql(command, function(err, results) {

            // error checks
            if (err) {
                return callback("An error occured while retrieving the public user for domain '" + domain + "':" + err);
            }

            if (results.length == 0) {
                return callback("No such domain: " + domain);
            }

            if (results.length > 1) {
                return callback("There can be only one domain: " + domain + ". Found: " + results.length);
            }

            if (!results[0] || !results[0].publicUser) {
                return callback("The domain '" + domain + "' has no public user.");
            }

            var rid = results[0].publicUser;
            var id = parseInt(rid.split(":")[1]);

            if (isNaN(id)) {
                return callback("Invalid public user id for domain '" + domain + "': " + rid);
            }

            callback(null, id);
        });
    });
};

function sql(command, callback) {
    console.log(command);
    db.command(command, callback);
}

