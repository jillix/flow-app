// the mono configuration as global object
CONFIG = require((process.env.MONO_ROOT || process.cwd()) + "/core/config");

var cp = require("child_process");

var appsApi = require(CONFIG.root + "/api/apps");
var orient = require(CONFIG.root + "/core/db/orient");


orient.connect(CONFIG.orient, function(err) {

    if (err) {
        console.error("Could not connect to the Orient database");
        console.error(err);
        process.exit(1);
    }

    appsApi.getApplications(function(err, apps) {

        if (err) {
            console.error("Could not retrieve the application list");
            console.error(err);
            process.exit(2);
        }

        var errors = [];
        var counter = 0;

        for (var i in apps) {

            (function(app) {

                appsApi.isApplicationRunning(app.id, function(err, running) {

                    if (err) {
                        errors.push(err);
                    } else if (!running) {

                        var starter = cp.spawn(CONFIG.root + "/admin/scripts/installation/start_app.sh", [app.id]);

                        starter.stderr.on("data", function (data) {
                            console.error(data.toString());
                        });

                        starter.on("exit", function(code) {
                            if (code) {
                                console.error("Failed to start application " + app.id + " (error: " + code + ")");
                            }

                            console.log("(Re)Started application " + app.id);
                        });
                    }
console.log(app.id + " " + counter);
                    if (++counter == apps.length) {
                        orient.disconnect(CONFIG.orient);
                    }
                });
            })(apps[i]);
        }
    });
});

