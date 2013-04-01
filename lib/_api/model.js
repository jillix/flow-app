



function getUser (appId, userName, callback) {

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


function assignRole (uid, rid, callback) {

    callback = callback || function() {};

    var urid = ridFromId("VUser", uid);
    var rrid = ridFromId("VRole", rid);

    var hash = null;
    var options = {
        "class" : "EMemberOf"
    };

    edge(urid, rrid, hash, options, function(err, edgeDoc) {

        if (err) {
            return callback(err);
        }

        callback(null);
    });
}




function addUser (appId, user, roles, callback) {

    var command =
        "INSERT INTO VUser SET " +
            "username = '" + user.username + "', " +
            "password = '" + user.password + "', " +
            "data = " + JSON.stringify(user.data);

    sql(command, function(err, results) {

        if (err || !results || results.length != 1 || !results[0] || !results[0]["@rid"]) {
            return  callback(err || "Failed to insert user '" + username + "' for application '" + appId + "'");
        }

        var rid = results[0]["@rid"];
        
        var id = idFromRid(rid);
        callback(null, id);
    });
};


function deleteUsers (aid, callback) {

    // find first all the RIDs of User nodes and their membership edges
    var command =
        "SELECT " +
            "@rid AS rid " +
        "FROM " +
            "(TRAVERSE VRole.in, EMemberOf.out FROM " +
                "(SELECT FROM VRole WHERE app = " + ridFromId("VApplication", aid) + ") " +
            ") " +
        "WHERE " +
            "@class = 'EMemberOf' OR " +
            "@class = 'VUser'";

    deleteRidsFromCommand(command, function(err) {

        if (err) {
            return callback("Failed to delete users for application with ID " + aid + ": " + JSON.stringify(err)); 
        }

        callback(null);
    });
};



function getApplications (callback) {

    var command =
        "SELECT " +
            "* " +
        "FROM " +
            "VApplication";

    sql(command, function(err, results) {

        if (err) {
            return callback("An error occurred while retrieving the applications: " + JSON.stringify(err));
        }

        var applications = results || [];

        callback(null, applications);
    });
}


function getApplicationDomains (appId, callback) {

    translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var aid = ridFromId("VApplication", id);

        var command =
            "SELECT " +
                "name " +
            "FROM " +
                "VDomain " +
            "WHERE " +
                "application = " + aid;

        sql(command, function(err, results) {

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

function addApplicationPort (appId, port, callback) {

    // if there is another application registered with this port, set its port to 0
    var command = "UPDATE VApplication SET port = 0  WHERE port = " + port + " AND id <> '" + appId + "'";

    sql(command, function(err) {

        if (err) {
            return callback(err || "Failed to remove obsolete ports from other applications.");
        }

        // save the port in this application
        var command = "UPDATE VApplication SET port = " + port + " WHERE id = '" + appId + "'";

        sql(command, function(err) {

            if (err) {
                return callback(err || "Failed to add port for application " + appId);
            }

            callback(null);
        });
    });
};


function getUserOperation (miid, method, userId, callback) {

    var vuCluster = M.orient.getClusterByClass("VUser");

    if (!vuCluster) { return callback("Could not find the VUser cluster ID."); }

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


/*function getDomainPublicUser (domain, callback) {

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
};*/


// operation
exports.addCanPerform = addCanPerform;

// application
exports.getApplications = getApplications;
exports.getApplicationDomains = getApplicationDomains;
exports.deleteApplicationDomains = deleteApplicationDomains;
exports.addApplicationPort = addApplicationPort;

// user
exports.getUser = getUser;
exports.assignRole = assignRole;
exports.addUser = addUser;
exports.deleteUsers = deleteUsers;
exports.getUserOperation = getUserOperation;
//exports.getDomainPublicUser = getDomainPublicUser;
