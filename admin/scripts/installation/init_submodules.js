// the mono configuration as global object
CONFIG = require(process.cwd() + "/config");

var cp = require('child_process');
var fs = require('fs');

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

    var descriptor = {
        dependencies: {
            "github/gabipetrovay/github": "latest"
        }
    };

    apps.installDependencies(descriptor, callback) {
        // TODO continue
    }
    // add mono modules as submodules
    model.getModuleUsedVersions(function(err, modules) {

        var count = modules.length;

        for (var i in modules) {

            (function(module) {

                var modulePath = module.source + "/" + module.owner + "/" + module.name + "/" + module.version;

                // skip if the module folder already exists
                if (fs.existsSync(CONFIG.root + "/modules/" + modulePath)) {
                    console.log("Skipping: " + modulePath);
                    if (!--count) {
                        close();
                    }
                    return;
                }

                // TODO add bitbucket to server API
                if (module.source === "bitbucket") {
                    console.log("Bitbucket modules not yet supported in install scripts. Please manually install: " + modulePath);
                    if (!--count) {
                        close();
                    }
                    return;
                }

                // try and fetch the module
                api.fetchModule(module, function(err) {

                    if (err) {
                        console.log("Failed to install module: " + modulePath);
                        console.log(err);
                    } else {
                        console.log("Installed module: " + modulePath);
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
    CONFIG.orient.DB.server.shutdown();
}
