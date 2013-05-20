var ds_model = require('./datasource/model');


function resolve (name, callback) {

    // TODO check name to be valid (and avoid SQL injection)
    if (!name) {
        return callback(M.error(M.error.API_DS_INVALID_NAME, name));
    }

    var appId = M.config.app.id;

    ds_model.get(appId, name, function(err, ds) {

        if (err) { return callback(err); }

        // TODO improve this:
        //      move db to data
        var datasource = {
            type: ds.type,
            db: ds.db
        };

        for (var i in ds.data) {
            datasource[i] = ds.data[i];
        }

        callback(null, datasource);
    });
}

exports.resolve = resolve;

