var app_model = require('../app/model');

/**
 * Adds the datasources for an application in the database.
 *
 * The application ID must be the internal OrientDB ID.
 * The datasources must be an object in the application descriptor form.
 */
function add (aid, datasources, callback) {

    if (!datasources || !Object.keys(datasources).length) {
        return callback(null);
    }

    // build the INSERT VALUES string
    var vaCluster = M.orient.getClusterByClass("VApplication");
    var valuesStr = "";
    // TODO issue with query parsing in 1.3.0: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var key in datasources) {
        valuesStr += "(" +
            "#" + vaCluster.id + ":" + aid + ", " +             // appId
            "'" + key + "', " +                                 // name
            "'" + datasources[key].type + "', " +               // type
            "'" + datasources[key].db + "', " +                // db
            // TODO adding a new datasource type requires a fix here:
            //      all the remaining keys are put into this object
            JSON.stringify({ collection: datasources[key].collection }) +
        ") , ";
    }
    // TODO hence the slice -2
    valuesStr = valuesStr.slice(0, -2);
    
    var command =
        "INSERT INTO VDatasource (" +
            "app, " +
            "name, " +
            "type, " +
            "db, " +
            "data " +
        ") VALUES " +
            valuesStr;

    M.orient.sqlCommand(command, function(err, results) {
        callback(err);
    });
}

/**
 * Removes one or more datasource for an application from the database.
 *
 * The application ID must be the internal OrientDB ID.
 * The datasource is optional which means that all satasources will be removed.
 * One can also provide a data source name as string or an array of strings.
 */
function remove (aid, dsName, callback) {

    var allDs = false;
    if (typeof dsName === 'function') {
        allDs = true;
        callback = dsName;
    } else if (typeof dsName === 'string') {
        dsName = [dsName];
    }

    var vaCluster = M.orient.getClusterByClass('VApplication');

    var command = 'DELETE FROM VDatasource WHERE app = #' + vaCluster.id + ':' + aid;
    if (!allDs) {
        command += ' AND name IN ' + JSON.stringify(dsName);
    }

    M.orient.sqlCommand(command, function(err, results) {
        callback(err);
    });
}

function get (appId, dsName, callback) {

    app_model.translateAppId(appId, function(err, id) {

        if (err) { return callback(err); }

        var vaCluster = M.orient.getClusterByClass('VApplication');

        var command =
            'SELECT ' +
                '* ' +
            'FROM VDatasource ' +
            'WHERE ' +
                'app = #' + vaCluster.id + ':' + id + ' AND ' +
                'name = "' + dsName + '"';

        M.orient.sqlCommand(command, function(err, results) {

            if (err) {
                return callback(M.error(M.error.DB_ORIENT_SQL_COMMAND_ERROR, command, JSON.stringify(err)));
            }

            // if there is no result
            if (!results || !results.length || !results[0]) {
                return callback(M.error(M.error.API_DS_NOT_FOUND, appId, dsName));
            }

            callback(null, results[0]);
        });
    });
}


exports.add = add;
exports.remove = remove;
exports.get = get;

