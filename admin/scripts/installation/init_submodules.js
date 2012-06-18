// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var cp = require('child_process');

var orient = require(CONFIG.root + "/core/db/orient.js");
var api = require(CONFIG.root + "/api/server");
var model = require(CONFIG.root + "/core/model/orient");


function openDbConnection(callback) {

    // start DB in dev mode
    if (CONFIG.dev) {
        var options = {
            cwd: CONFIG.root + "/bin/orientdb/bin"
        };
        // start db server
        dbServer = cp.spawn(options.cwd + "/server.sh", [], options);
        dbServer.on('exit', function(){
            console.log("server exited");
        });

        setTimeout(function() {
            // connect to orient
            orient.connect(CONFIG.orient, function(err, db) {
                if (err) {
                    throw new Error(JSON.stringify(err));
                }
                CONFIG.orient.DB = db;
                callback();
            });
        }, CONFIG.orient.startTime);
    }
}

openDbConnection(function() {

    // add mono modules as submodules
    model.getModules(function(err, modules) {

        var count = modules.length;

        for (var i in modules) {

            // ignore the modules checked in the mono repo that have "TODO" as version
            if (modules[i].version === "TODO") {

                console.log("Skipping module: " + modules[i].owner + "/" + modules[i].name);

                if (!--count) {
                    close()
                }

                continue;
            }

            (function(module) {

                api.fetchModule(module.owner, module.name, module.version, function(err) {

                    if (err) {
                        console.log("Failed to install module: " + module.owner + "/" + module.name + "/" + module.version);
                        console.log(err);
                    } else {
                        console.dir("Installed module: " + module.owner + "/" + module.name + "/" + module.version);
                    }

                    if (!--count) {
                        close();
                    }
                });
            })(modules[i]);
        }
    });
});


function close() {
console.log("closing db...");
    CONFIG.orient.DB.close(function() {
console.log("closing server...");
        dbServer.kill();
    });
}
