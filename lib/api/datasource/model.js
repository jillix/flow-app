
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
};

exports.add = add;

