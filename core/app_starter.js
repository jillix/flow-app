var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");
var spawn = require("child_process").spawn;
var model = require(CONFIG.root + "/core/model/orient.js");

/*
 * This MUST be called only ONCE per application process
 */
function startApplication(appId, host, callback) {

    // TODO multiple-domain applications must be started only once

    // add the required MONO_ROOT variable to the environment
    var env = process.env;
    env.MONO_ROOT = CONFIG.root;
    var node = spawn(CONFIG.root + "/admin/scripts/installation/start_app.sh", [ appId ], { env: env });

    var log = fs.createWriteStream(CONFIG.APPLICATION_ROOT + appId + "/log.txt");
    node.stdout.pipe(log);
    node.stderr.pipe(log);
    
    if (CONFIG.logTerm) {
        node.stdout.pipe(process.stdout);
        node.stderr.pipe(process.stderr);
    }

    var errorRetries = 3;
    var id = setInterval(function() {

        // find the application for this domain (without the routing table)
        model.getDomainApplication(host, false, function(err, application) {

            // try maximum 3 time in case something really bad happens (orient crashes)
            // at this point the application is for sure valid
            if (err) {
                if (!errorRetries) {
                    clearInterval(id);
                    return callback(err);
                } else {
                    --errorRetries;
                    return;
                }
            };

            // retry as long as the application does not have a port
            if (!application.port) {
                return;
            }

            clearInterval(id);
            callback(null, application);
        });

    }, 500);
}

exports.startApp = startApplication;

