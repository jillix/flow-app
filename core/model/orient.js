
exports.getModuleUsedVersions = function(callback) {

    var command =
        "SELECT " +
            "in.source AS source, " +
            "in.owner AS owner, " +
            "in.name AS name, "+
            "version " +
        "FROM " +
            "EHasAccessTo";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module versions: " + JSON.stringify(err));
        }

        // duplicate ellimination
        // TODO is there a better way to do this?
        var versions = {};
        for (var i in results) {
            var version = results[i];
            var key = version.source + "/" + version.owner + "/" + version.name + "/" + version.version;
            versions[key] = version;
        }

        // transform back to array
        results = [];
        for (var i in versions) {
            results.push(versions[i]);
        }

        callback(null, results);
    });
};


exports.getModules = function(callback) {

    var command =
        "SELECT " +
            "source, owner, name " +
        "FROM " +
            "VModule";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving modules: " + JSON.stringify(err));
        }

        callback(null, results);
    });
};


exports.getModule = function(source, owner, name, callback) {

    var command =
        "SELECT " +
        "FROM " +
            "VModule " +
        "WHERE " +
            "source = '" + source + "' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving module '" + source + "/" + owner + "/" + name + "': " + JSON.stringify(err));
        }

        callback(null, results[0] || null);
    });
};


exports.insertOperations = function(operations, callback) {

    if (!operations || !operations.length) {
        return callback(null, []);
    }

    // build the INSERT VALUES string
    var opsStr = "";
    for (var i in operations) {
        opsStr += "('" + operations[i].file + "', '" + operations[i]["function"] + "'),";
    }
    opsStr = opsStr.slice(0, -1);

    var command =
        "INSERT INTO VOperation (" +
            "file, " +
            "method" +
        ") VALUES " +
            opsStr;

    sql(command, callback);
};


exports.insertBelongsTo = function(rid, version, operations, callback) {

    if (!operations || !operations.length) {
        return callback(null, []);
    }

    var edgeStr = "";
    for (var i in operations) {
        edgeStr += "('" + version + "', " + operations[i]["@rid"] + ", " + rid + "),";
    }
    edgeStr = edgeStr.slice(0, -1);

    var command =
        "INSERT INTO EBelongsTo (" +
            "version, " +
            "out, " +
            "in" +
        ") VALUES " +
            edgeStr;

    sql(command, callback);
};


exports.insertModuleVersion = function(module, callback) {

    // find the module
    exports.getModule(module.source, module.owner, module.name, function(err, mod) {

        var rid = mod['@rid'];

        // insert the operations
        exports.insertOperations(module.operations, function(err, inserted) {
        
            if (err) {
                return callback("An error occurred while inserting module operations for module '" + module.relativePath() + "': " + JSON.stringify(err));
            }

            // insert the EBelongsTo edge between operations and module
            exports.insertBelongsTo(rid, module.version, inserted, function(err, inserted) {
                if (err) {
                    return callback("An error occurred while inserting module operations edges for module '" + module.relativePath() + "': " + JSON.stringify(err));
                }

                // TODO insert the lings in the "in" list for the module
                //db.save(module);

                callback(null);
            });
        });
    });
};


exports.deleteModuleVersion = function(source, owner, module, version, callback) {

    // find the module
    exports.getModule(source, owner, module, function(err, mod) {

        var rid = mod['@rid'];
        var command = "TRAVERSE EHasAccessTo.out FROM (SELECT FROM EHasAccessTo WHERE in = " + rid + ") LIMIT 3";

        sql(command, function(err, results) {

            // TODO add results.length != 2 when checking user rights
            if (err || !results) {
                return callback("Could not delete module version: " + source + "/" + owner  + "/" + module + "/" + version);
            }

            var command =
                "DELETE FROM " +
                    "(TRAVERSE " +
                        "EBelongsTo.out " +
                    "FROM " +
                        "(SELECT FROM EBelongsTo " +
                        "WHERE " +
                            "in = " + rid + " AND " +
                            "version = '" + version + "'))";

            sql(command, function(err, results) {

                if (err) {
                    return callback("An error occurred while deleting module version '" + source + "/" + owner + "/" + module + "/" + version + "': " + JSON.stringify(err));
                }

                callback(null);
            });
        });
    });
};


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

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    var command =
        "SELECT " +
            "in.out[0].in.source AS source, " +
            "in.out[0].in.owner AS owner, " +
            "in.out[0].in.name AS name, " +
            "in.out[0].version AS version, " +
            "in.file AS file, " +
            "params " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
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
        
        callback(null, operation);
    });
};


exports.getModuleConfig = function(appId, miid, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "in.source AS source, " +
            "in.owner AS owner, " +
            "in.name AS name, " +
            "version, " +
            "config, html, " +
            "css " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'EUsesInstanceOf' AND " +
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


exports.getModuleFile = function(source, owner, name, userId, callback) {

    var vuCluster = CONFIG.orient.DB.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

    // TODO the link to the appId is missing
    //      only miid's from this appId must be searched
    var command =
        "SELECT " +
            "dir, source, owner, name, latest " +
        "FROM " +
            "(TRAVERSE VUser.out, EMemberOf.in, VRole.out, EHasAccessTo.in FROM #" + vuCluster.id + ":" + userId + ") " +
        "WHERE " +
            "@class = 'VModule' AND " +
            "source = '" + source + "' AND " +
            "owner = '" + owner + "' AND " +
            "name = '" + name + "'";

    sql(command, function(err, results) {

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
    if (CONFIG.log.orientQueries || CONFIG.logLevel === "verbose") {
        console.log(command);
    }
    CONFIG.orient.DB.command(command, callback);
}
