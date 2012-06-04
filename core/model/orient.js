
exports.getUser = function(appId, userName, callback) {

    var command =
        "SELECT " +
            "@rid AS uid, " +
            "password, " +
            "data " +
        "FROM " +
            "(TRAVERSE roles, VRole.in, EMemberOf.out FROM (SELECT FROM VApplication WHERE id = '" + appId + "')) " +
        "WHERE " +
            "@class = 'VUser' AND " +
            "username = '" + userName + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the user information for user '" + userName + "': " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback(null, null);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the user with username: " + userName);
        }

        var user = results[0];

        // if the user does not have the required fields
        if (!user || !user.uid) {
            return callback("Missing user ID: " + JSON.stringify(user.uid));
        }
        var uid = idFromRid(user.uid);
        if (uid === null) {
            return callback("Missing user ID: " + JSON.stringify(user.uid));
        }

        user.uid = uid;

        callback(null, { uid: uid, password: user.password, data: user.data || {} });
    });
};


exports.getAppId = function(domain, callback) {

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

            callback(null, application.appId);
        });
};


exports.getDomainApplication = function(domain, withRoutes, callback) {

    var command =
        "SELECT " +
            "application.id as appId, " +
            (withRoutes ? "application.routes AS routes, " : "") +
            "application.publicDir AS publicDir, " +
            "application.error AS errorMiid " +
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
        if (!application || !application.appId) {
            return callback("The application object is not complete. Check if the application ID is present: " + JSON.stringify(application));
        }

        if (withRoutes && !application.routes) {
            return callback("The application object is not complete. Missing application routing table: " + JSON.stringify(application));
        }

        callback(null, application);
    });
};


exports.getUserOperation = function(miid, method, userId, callback) {

    var vuClusterId = CONFIG.orient.DB.getClusterIdByClass("VUser");

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
};


exports.getModuleConfig = function(appId, miid, userId, callback) {

    var vuClusterId = CONFIG.orient.DB.getClusterIdByClass("VUser");

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

    var vuClusterId = CONFIG.orient.DB.getClusterIdByClass("VUser");

    if (vuClusterId < 0) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "dir, owner, name " +
        "FROM " +
            "VModule " +
        "WHERE " +
            "library = true AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

        // error checks
        if (err) {
            return callback("An error occured while retrieving the module '" + owner + "/" + name + "':" + err);
        }

        if (results.length != 0) {
            var module = results[0];
            return callback(null, results[0]);
        }

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

    });
}


exports.getDomainPublicUser = function(domain, callback) {

    var command =
        "SELECT " +
            "application.publicUser AS publicUser, " +
            "application.id AS appId " +
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

        var app = results[0];

        if (!app || !app.publicUser) {
            return callback("The domain '" + domain + "' has no public user.");
        }

        var rid = app.publicUser;
        var id = idFromRid(rid);

        if (id === null || !app.appId) {
            return callback("Invalid public user ID or application ID for domain '" + domain + "': " + id);
        }

        callback(null, { uid: id, appid: app.appId });
    });
};


function idFromRid(rid) {
    if (typeof rid === "string") {
        var number = parseInt(rid.split(":")[1]);
        if (!isNaN(number)) {
            return number;
        }
    }
    return null;
}


function sql(command, callback) {
    //console.log(command);
    CONFIG.orient.DB.command(command, callback);
}
