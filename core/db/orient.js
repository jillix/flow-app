var orient = require("orientdb"),
    GraphDb = orient.GraphDb,
    Server = orient.Server;

function connect(config, callback) {

    openDb(config, function(err) {

        //if (err && err.indexOf("ECONNREFUSED" != -1) && CONFIG.logLevel == "debug") {
        //    // start the server and retry the connection
        //    startServer(function(err) {
        //        if (err) { return callback(err); }
        //        openDb(config, callback);
        //    });
        //} else {
            callback(err);
        //}
    });
}


function disconnect(config) {
    config.DB.close();
}


function startServer(callback) {

    var options = {
        cwd: CONFIG.root + "/bin/orientdb/bin"
    };

    console.log("Starting OrientDB in debug mode...");

    // start db server
    var cp = require("child_process");
    CHILD_SERVER = cp.spawn(options.cwd + "/server.sh", ["&"], options);

    setTimeout(callback, CONFIG.orient.startTime);
};


function openDb(config, callback) {

    var server = new Server(config.server),
        db = new GraphDb(config.db.database_name, server, config.db);

    db.open(function(err) {

        if (err) { return callback(err); }

        config.DB = db;

        callback(null, db);
    });

}


exports.connect = connect;
exports.disconnect = disconnect;

