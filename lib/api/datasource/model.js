function addDatasources (aid, datasources, callback) {

    if (!datasources || !Object.keys(datasources).length) {
        return callback(null);
    }

    // build the INSERT VALUES string
    var vaCluster = M.orient.getClusterByClass("VDatasource");
    var valuesStr = "";
    // TODO issue with query parsing in 1.3.0: for multiple values spaces around the comma are significant
    // https://github.com/nuvolabase/orientdb/issues/1250
    for (var key in datasources) {
        valuesStr += "(#" + vaCluster.id + ":" + aid + ", '" +   // appId
                     key + "', '" +                              // name
                     datasources[key].type + "', '" +            // type
                     datasources[key].db + "', '" +              // db
                     datasources[key].collection + "') , ";      // data (collection)
    }
    // TODO hence the slice -2
    valuesStr = valuesStr.slice(0, -2);
    
    var command =
        "INSERT INTO VDatasource (" +
            "app, " +
            "name " +
            "type " +
            "db " +
            "data " +
        ") VALUES " +
            valuesStr;

    M.orient.sqlCommand(command, function(err, results) {
        // TODO: Find the error!!!!
        // console.log(command);
        // console.log("> SQL Error:");
        // console.log(err);

        callback(err);
    });
};

exports.addDatasources = addDatasources;
