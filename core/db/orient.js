var orient = require("orientdb"),
    Db = orient.Db,
    Server = orient.Server;

function connect(config, callback) {

    // start DB in dev mode
    if (CONFIG.dev) {

        startServer(function() {
            openDb(config, callback);
        });

    } else {
        console.log("The Orient DB server will not be started in non-dev mode. Make sure it is already running.");
        openDb(config, callback);
    }

}


function disconnect(config) {
    config.DB.close();
}


function startServer(callback) {

    var options = {
        cwd: CONFIG.root + "/bin/orientdb/bin"
    };

    // start db server
    var cp = require("child_process");
    dbServer = cp.spawn(options.cwd + "/server.sh", [], options);

    setTimeout(callback, CONFIG.orient.startTime);
};


function openDb(config, callback) {
    var server = new Server(config.server),
        db = new Db(config.db.database_name, server, config.db);

    db.open(function(err) {

        if (err) { return callback(err); }

        config.DB = db;

        callback(null, db);
    });
}


exports.connect = connect;
exports.disconnect = disconnect;

