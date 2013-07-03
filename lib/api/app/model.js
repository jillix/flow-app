var collection = M.db.collection('applications');

function getApplication (appId, callback) {
    
    if (!(appId instanceof M.mongo.ObjectID)) {
        return callback(M.error(M.error.API_APP_INVALID_ID, appId));
    }
    
    collection.findOne({_id: appId}, {fields: {_id: 0}}, function (err, app) {
        
        if (err) {
            return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, command, JSON.stringify(err)));
        }

        // if there is no result
        if (!app) {
            return callback(M.error(M.error.API_APP_NOT_FOUND, appId));
        }
        
        app.id = appId;

        callback(null, app);
    });
}

function addApplication (appId, name, routes, errors, scripts, publicDir, locale, callback) {

    var command =
        "INSERT INTO VApplication SET " +
            "id = '" + appId + "', " +
            "name = '" + name + "', " +
            "routes = " + JSON.stringify(routes) + ", " +
            "errors = " + JSON.stringify(errors) + ", " +
            "scripts = " + JSON.stringify(scripts) + ", " +
            "publicDir = '" + publicDir + "', " +
            "publicRole = null, " +
            "locale = '" + locale + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
            return  callback(err || "Failed to insert application: " + appId + "(" + name + ")");
        }

        callback(null, M.orient.idFromRid(results[0]["@rid"]));
    });
}

function deleteApplication (appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var arid = M.orient.ridFromId("VApplication", id);

        // check if the application has roles and if it does, do not allow its deletion
        var command = "SELECT FROM VRole WHERE app = " + arid;

        M.orient.sqlCommand(command, function(err, results) {

            if (err) {
                return callback("Failed to delete application " + appId + ": " + JSON.stringify(err));
            }

            if (results && results.length > 0) {
                return callback("Cannot delete application " + appId + " because it still has roles assigned to it. Delete the roles first.");
            }

            // now find all the RIDs of domain nodes and the application node
            var command =
                "DELETE " +
                "FROM " +
                    "VApplication " +
                "WHERE " +
                    "id = '" + appId + "'";

            M.orient.sqlCommand(command, function(err) {

                if (err) {
                    return callback("Failed to delete the application " + appId + ": " + JSON.stringify(err)); 
                }

                callback(null);
            });
        });
    });
}

function getApplications (callback) {

    var command =
        "SELECT " +
            "* " +
        "FROM " +
            "VApplication";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the applications: " + JSON.stringify(err));
        }

        var applications = results || [];

        callback(null, applications);
    });
}

function getDomains (appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = M.orient.ridFromId("VApplication", id);

        var command =
            "SELECT " +
                "name " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "application = " + aid;

        M.orient.sqlCommand(command, function(err, results) {

            if (err) {
                return callback("An error occurred while retrieving the domain for application " + appId + ": " + JSON.stringify(err));
            }

            // if there is no result
            if (!results || results.length == 0) {
                return callback("No domains found for application " + appId);
            }

            var domains = [];
            for (var i in results) {
                domains.push(results[i].name);
            }

            callback(null, domains);
        });
    });
}

function addDomains (aid, domains, callback) {

    if (!domains || !domains.length) {
        return callback(null);
    }

    // build the INSERT VALUES string
    var vaCluster = M.orient.getClusterByClass("VApplication");
    var valuesStr = "";
    // TODO issue with query parsing in 1.3.0: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var i in domains) {
        valuesStr += "(#" + vaCluster.id + ":" + aid + ", '" + domains[i] + "') , ";
    }
    // TODO hence the slice -2
    valuesStr = valuesStr.slice(0, -2);

    var command =
        "INSERT INTO VDomain (" +
            "application, " +
            "name " +
        ") VALUES " +
            valuesStr;

    M.orient.sqlCommand(command, function(err, results) {
        callback(err);
    });
};

function deleteDomains (appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = M.orient.ridFromId("VApplication", id);

        var command =
            "DELETE " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "application = " + aid;

        M.orient.sqlCommand(command, function(err, results) {

            if (err) {
                return callback("An error occurred while deleting the domains for application " + appId + ": " + JSON.stringify(err));
            }

            callback(null);
        });
    });
}

function addRole (appId, name, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = M.orient.ridFromId("VApplication", id);

        // first add the Role node
        var command =
            "INSERT INTO VRole SET " +
                "name = '" + name + "', " +
                "app = " + aid;

        M.orient.sqlCommand(command, function(err, results) {

            if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
                return  callback(err || "Failed to insert role '" + name + "' for application '" + appId + "'");
            }

            var rid = results[0]["@rid"];

            // now add this Role in the application reference list
            var command =
                "UPDATE " + aid + " ADD roles = " + rid;

            M.orient.sqlCommand(command, function(err, results) {

                if (err) {
                    return  callback("Failed to insert role '" + rid + "' into application '" + appId + "'. " + JSON.stringify(err));
                }

                callback(null, M.orient.idFromRid(rid));
            });
        });
    });
};

function getRole (appId, name, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = M.orient.ridFromId("VApplication", id);

        var command =
            "SELECT " +
            "FROM VRole " +
            "WHERE " +
                "app = " + aid + " AND name = '" + name + "'";

        M.orient.sqlCommand(command, function(err, results) {

            if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
                return callback(M.error(M.error.API_APP_ROLE_NOT_FOUND, name, appId));
            }

            var role = {
                id: M.orient.idFromRid(results[0]["@rid"]),
                name: results[0].name
            };

            callback(null, role);
        });
    });
};

function deleteRoles (aid, callback) {

    // find first all the RIDs of role nodes and their permission edges
    var command =
        "SELECT " +
            "@rid AS rid " +
        "FROM " +
            "(TRAVERSE out FROM " +
                "(SELECT FROM VRole WHERE app = " + M.orient.ridFromId("VApplication", aid) + ") " +
            ") ";

    deleteRidsFromCommand(command, function(err) {

        if (err) {
            return callback("Failed to delete roles for application with ID " + aid + ": " + JSON.stringify(err)); 
        }

        callback(null);
    });
};

function updatePublicRole (appId, uid, callback) {

    callback = callback || function() {};

    var command =
        "UPDATE Vapplication SET publicRole = " + M.orient.ridFromId("VRole", uid) + " WHERE id = '" + appId + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0]) {
            return  callback(err || "Failed to update the public role for application: " + appId);
        }

        callback(null);
    });
}

/**
 * This executes an SQL command and deletes all the matching records returned based on their RIDs.
 */
function deleteRidsFromCommand (command, callback) {

    M.orient.sqlCommand(command, function(err, results) {

        if (err) { return callback(err); }

        if (!results || !results.length) { return callback(null); }

        var rids = [];
        for (var i in results) {
            if (results[i].rid) {
                rids.push(results[i].rid);
            }
        }

        deleteRids(rids, callback);
    });
}

/**
 * This deletes multiple records given their RIDs in the rids parameter.
 */
function deleteRids (rids, callback) {

    if (!(rids instanceof Array) || !rids.length) {
        return callback(null);
    }

    // gather all the RIDs for the DELETE command
    var toDelete = "";
    for (var i in rids) {
        toDelete += rids[i] + ",";
    }
    toDelete = toDelete.slice(0, -1);

    // delete all the users and their membership edges
    command = "DELETE FROM [" + toDelete + "]";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("Failed to delete RIDs " + JSON.stringify(rids) + ": " + JSON.stringify(err));
        }

        callback(null);
    });
}

function getFromHost (host, fields, callback) {

    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }

    // prevent sql injection attacks
    host = host.replace(/[^0-9a-z\-_\.]/gi, '');

    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }

    if (typeof fields === 'function') {
        callback = fields;
        fields = null;
    }
    
    collection.findOne({domains:host},{fields:fields}, function (err, data) {
        
        if (err) {
            return callback(err);
        }

        if (!data) {
            return callback(M.error(M.error.API_APP_NOT_FOUND, host));
        }

        callback(null, data);
    });
}


exports.getApplication = getApplication;
exports.addApplication = addApplication;
exports.deleteApplication = deleteApplication;
exports.getApplications = getApplications;
exports.getFromHost = getFromHost;

exports.getDomains = getDomains;
exports.addDomains = addDomains;
exports.deleteDomains = deleteDomains;

exports.getRole = getRole;
exports.addRole = addRole;
exports.deleteRoles = deleteRoles;
exports.updatePublicRole = updatePublicRole;

