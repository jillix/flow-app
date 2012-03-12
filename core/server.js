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
        var forever = require("forever");
        self.server = new forever.Monitor(monoServerPath, config.forever);
        addHandlers(self.server, self.config);
    }
    else {
        var Router = require(monoServerPath).Router;
        self.server = new Router();
    }
}

Server.prototype.start = function() {
    var self = this;

    self.server.start();
}

function addHandlers(server, config) {

    // file load error
    server.on("error", function() {
        util.log("Error: Loading HTTP Server [Parameter: " + params.join(", ") + "] as daemon failed!");
    });

    // process error
    server.on("stderr", function(err) {

        console.log("stderr");

        lastError = err.toString("utf8");
    });

    var transport = nodemailer.createTransport("Sendmail");

    // restart event
    server.on("restart", function() {
    
        var title = "Info: Restarted HTTP Server";
        var error = lastError || "unknown error";

        util.log(title);
        util.log(error);

        if (config.adminEmail) {
   
            var mail = {
                transport: transport,
                from:    "admin@jillix.com",
                to:      config.adminEmail,
                subject: title,
                body:    "Error Log: \n" + error
            };

            nodemailer.send_mail(mail, function(err, success) {
                if (!success) {
                    util.log("Error: Notification sending failed!");
                }
            });
        }
    });
}

