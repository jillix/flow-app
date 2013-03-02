var fs = require("fs");
var util = require(CONFIG.root + "/core/util.js");
var spawn = require("child_process").spawn;
var model = require(CONFIG.root + "/core/model/orient.js");

/*
 * This MUST be called only ONCE per application process
 */
function startApplication(host, socket, buffer, application, callback) {
    
    // TODO multiple-domain applications must be started only once

    var appPath = CONFIG.APPLICATION_ROOT + application.appId;

    // the application directory must be present
    // otherwise the piped streams below will crash the mono server
    if (!fs.existsSync(appPath)) {
        return callback(host, socket, buffer, "Application directory not found: " + application.appId);
    }

    // add the required MONO_ROOT variable to the environment
    var env = process.env;
    env.MONO_ROOT = CONFIG.root;
    var log = fs.createWriteStream(appPath + "/log.txt");
    var node = spawn(CONFIG.root + "/admin/scripts/installation/start_app.sh", [ application.appId ], { env: env });
    
    node.stderr.on('data', function (err) {
        callback(host, socket, buffer, err.toString());
    });
    
    // get pid if app is running
    node.stdout.once('data', function (data) {
        
        data = parseInt(data.toString('ascii'), 10);
        
        if (data) {
            // TODO check first if another application uses this port
            application.port = data;
        }
    });
    
    node.on('exit', function () {

// TODO make sure the http server of the application is started
setTimeout(function () {
        
        // TODO check if the application is still using the port and remove it from the
        // database in order not to screw future admin statistics
        
        if (application.port) {
            return callback(host, socket, buffer, null, application);   
        }
        
        // find the application for this domain (without the routing table)
        model.getDomainApplication(host, false, function(err, application) {
            
            if (err) {
                return callback(host, socket, buffer, err);
            };
            
            // retry as long as the application does not have a port
            if (!application.port) {
                return callback(host, socket, buffer, new Error('Port error'));
            }
            
            callback(host, socket, buffer, null, application);
        });
}, 1000);

    });
    
    node.stdout.pipe(log);
    node.stderr.pipe(log);

    if (CONFIG.logTerm) {
        node.stdout.pipe(process.stdout);
        node.stderr.pipe(process.stderr);
    }
}

exports.startApp = startApplication;
