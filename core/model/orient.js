var orient = require("orientdb"),
    Db = orient.Db,
    Server = orient.Server;

var server = new Server(CONFIG.orient.server),
    db = new Db(CONFIG.orient.db.database_name, server, CONFIG.orient.db);

exports.getAppId = function(domain, callback) {
    
    db.open(function(err, result) {

        if (err) { return callback(err); }

        var command =
            "SELECT " +
                "application.id AS appId " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "name = '" + domain + "'";

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the application ID for domain '" + domain + "': " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("Domain not found: " + domain);
            }

            // if there are too many results
            if (results.length > 1) {
                return callback("Could not uniquely determine the application ID for domain: " + domain);
            }

            var application = results[0];

            // if the application does not have the required fields
            if (!application || !application.appId) {
                return callback("Missing application ID: " + JSON.stringify(application));
            }

            callback(null, application);
        });
    });
};

exports.getDomainRoutes = function(domain, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        var command =
            "SELECT " +
                "application.routes AS routes " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "name = '" + domain + "'";

        sql(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the routing table for domain '" + domain + "': " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("Domain not found: " + domain);
            }

            // if there are too many results
            if (results.length > 1) {
                return callback("Could not uniquely determine the application ID for domain: " + domain);
            }

            var application = results[0];

            // if the application does not have the required fields
            if (!application || !application.routes) {
                return callback("The application object is not complete. Check if the routes are present: " + JSON.stringify(application));
            }

            callback(null, application.routes);
        });
    });
};

exports.getUserOperation = function(miid, method, userId, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
        var vuClusterId = db.getClusterIdByClass("VUser");

        if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

        var command =
            "SELECT " +
                "in.module AS module, in.file AS file, params " +
            "FROM " +
                "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuClusterId + ":" + userId + ") " +
            "WHERE " +
                "@class = 'ECanPerform' AND " +
                "miid = '" + miid + "' AND " +
                "in.method = '" + method + "'";

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

            // TODO is this stil necessary?
            // if the operation has parameters, parse them as JSON
            if (operation.params) {
                operation.params = JSON.parse(operation.params);
            }

            callback(null, operation);
        });
    });
};

exports.getModuleConfig = function(appId, miid, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
    var vuClusterId = db.getClusterIdByClass("VUser");

    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "in.owner AS owner, in.name AS name, config, html, css " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuClusterId + ":" + userId + ") " +
        "WHERE " +
            "@class = 'EHasAccessTo' AND " +
            "miid = '" + miid + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module instance (app: " + appId + "): " + miid);
        }

        if (results.length > 1) {
            return callback("There can be only one module (app: " + appId + "): " + miid + ". Found: " + results.length);
        }

        var module = results[0];
        callback(null, module);
    });
}


exports.getModuleFile = function(owner, name, userId, callback) {

    // TODO add either a db.open or make the db.open call before any operation
    // TODO the cluster IDs should be searched for in the mono initialization phase where also the connection is opened
    var vuClusterId = db.getClusterIdByClass("VUser");

    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "dir, owner, name " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuClusterId + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModule' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + owner + "/" + name + "':" + err);
        }

        if (results.length == 0) {
            return callback("No such module: " + owner + "/" + name);
        }

        var module = results[0];
        callback(null, module);
    });
}

this.getDomainPublicUser = function(domain, callback) {

    db.open(function(err, result) {

        if (err) { return callback(err); }

        var command =
            "SELECT " +
                "application.publicUser AS publicUser " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "name = '" + domain + "'";

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
    //console.log(command);
    db.command(command, callback);
}
