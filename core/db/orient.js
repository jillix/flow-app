var orient = require("orientdb"),
    Db = orient.Db,
    Server = orient.Server;

exports.connect = function(config, callback) {

    var server = new Server(config.server),
        db = new Db(config.db.database_name, server, config.db);

    db.open(function(err) {

        if (err) { return callback(err); }

        callback(null, db);
    });
};

