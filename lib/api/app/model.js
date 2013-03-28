
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

function addApplicationDomains (aid, domains, callback) {

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
 * This translates an appId (a application logical ID, what one finds in a descriptor)
 * into a database internal application id
 */
function translateAppId (appId, callback) {

    if (typeof appId !== "string" && appId.length != 32) {
        return callback("Invalid application id: " + appId);
    }

    var command =
        "SELECT " +
            "@rid AS rid " +
        "FROM " +
            "VApplication " +
        "WHERE " +
            "id = '" + appId + "'";

    M.orient.sqlCommand(command, function(err, results) {

        if (err) {
            return callback("An error occurred while translating the application ID: " + appId + ". " + JSON.stringify(err));
        }

        // if there is no result
        if (!results || results.length == 0) {
            return callback("Application not found: " + appId);
        }

        // if there are too many results
        if (results.length > 1) {
            return callback("Could not uniquely determine the application with ID: " + appId);
        }

        var application = results[0];

        // if the application does not have the required fields
        if (!application || !application.rid) {
            return callback("Missing application ID: " + JSON.stringify(application));
        }

        callback(null, M.orient.idFromRid(application.rid));
    });
}

function getFromHost (host, fields, callback) {
    
    if (typeof host !== 'string') {
        return callback(new Error('Host must be a string'));
    }
    
    // prevent sql injection attacks
    host = host.replace(/[^0-9a-z\.]/gi, '');
    
    if (!host || host.length < 4) {
        return callback(new Error('Host length must be greater than 3.'));
    }
    
    if (typeof fields === 'function') {
        callback = fields;
        fields = null;
    }
    
    var command = 'SELECT ' + M.orient.sqlSelectFields(fields, 'application') + ' FROM VDomain WHERE name = "' + host + '"';
    
    M.orient.sqlCommand(command, function (err, data) {

        if (err) {
            return callback(err);
        }

        if (!data || !data.length) {
            return callback(M.error(M.error.APP_NOT_FOUND, host));
        }

        if (data.length > 1) {
            return callback(M.error(M.error.MULTIPLE_APPS_FOUND, host));
        }
        
        callback(null, data[0]);
    });
}


exports.addApplication = addApplication;
exports.addApplicationDomains = addApplicationDomains;
exports.addRole = addRole;
exports.updatePublicRole = updatePublicRole;

exports.getFromHost = getFromHost;

