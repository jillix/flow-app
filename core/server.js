var nodemailer = require("nodemailer"),
    util       = require("util");

var params    = [process.argv[2] || __dirname + "/config.js"],
    lastError = "";

var Server = exports.Server = function (config) {
    var self = this;

    self.config = config;
    self.server = null;

    var monoServerPath = config.root + "/" + config.monoServer;

    if (config.forever) {
        var forever = require('forever');
        self.server = new forever.Monitor(monoServerPath, config.forever);
        addHandlers(self.server, self.config);
    }
    else {
        var router = require(monoServerPath);
        self.server = new router();
    }
}

Server.prototype.start = function() {
    var self = this;

    self.server.start();
}

function addHandlers(server, config) {

    //file load error
    server.on("error", function() {
    
        util.log("Error: Loading HTTP Server [Parameter: " + params.join(", ") + "] as daemon failed!");
    });
    
    //process error
    server.on("stderr", function(err) {
        
        console.log("stderr");
    
        lastError = err.toString("utf8");
    });
    
    var transport = nodemailer.createTransport("Sendmail");
    
    //restart event
    server.on("restart", function() {
    
        util.log("Info: Restarted HTTP Server [Parameter: " + params.join( ", " ) + "]!");
        util.log(lastError);

        if (config.adminEmail) {
    
            nodemailer.send_mail(
                {
                    transport: transport,
                    from:    "admin@jillix.com",
                    to:      config.adminEmail,
                    subject: "Notification: HTTP Server [ Parameter: " + params.join( ", " ) + " ] crashed and restarted!",
                    body:    "Error Log: \n" + lastError
                },
                function(err, success) {
                
                    if (!success) {
                        
                        util.log("Error: Notification sending failed!");
                    }
                }
            );
        }
    });
}

