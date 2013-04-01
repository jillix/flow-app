var fs = require("fs");


function getApplication(id, callback) {

    M.model.getApplication(id, function(err, app) {

        // TODO do not return all information, define an API !!!

        // TODO also get the application domains

        callback(err, app);
    });
}


function getApplicationDomains(id, callback) {

    M.model.getApplicationDomains(id, function(err, domains) {

        callback(err, domains);
    })
}


function getApplications(callback) {
    M.model.getApplications(callback);
}


var cp = require("child_process");

function isApplicationRunning(appId, callback) {
    
    var apid = cp.spawn('pgrep', ['-f', appId]);
    
    var pid = '';
    apid.stdout.on('data', function () {
        pid += data.toString('ascii');
    });
    
    var error = "";
    apid.stderr.on("data", function (data) {
        error += data.toString();
    });

    apid.on("exit", function(code) {
        
        if (error) {
            return callback(error);
        }
        
        if (parseInt(pid, 10)) {
            return callback(null, true);
        }
        
        callback(null, false);
    });
}

exports.getApplication = getApplication;
exports.getApplications = getApplications;
exports.getApplicationDomains = getApplicationDomains;
exports.isApplicationRunning = isApplicationRunning;
