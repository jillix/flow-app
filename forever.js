var forever     = require("forever"),
    nodemailer  = require("nodemailer"),
    util        = require("util"),
    config      = require("./config.js");

// prepare the mailer
var transport = nodemailer.createTransport("Sendmail");

// read the configuration and prepare the forever child process
var monoServerPath = config.root + "/" + config.monoServer;
var child = new forever.Monitor(monoServerPath, config.forever);

var lastError = null;


// child process output
child.on("stdout", function(data) {
    console.log(data.toString());
});

// child process error
child.on("stderr", function(err) {
    console.log(err.toString());
    lastError = err.toString("utf8");
});

// file load error
child.on("error", function() {
    util.log("Error: Starting HTTP Server failed!");
});

// restart event
child.on("restart", function() {

    var subject = "Info: Restarted HTTP Server";
    var error = lastError || "unknown error";

    util.log(subject);
    util.log(error);

    sendEmail(subject, error);
});

// start the child process
child.start();


function sendEmail(subject, error) {

    if (config.adminEmail) {

        var mail = {
            transport: transport,
            from:    config.adminEmail,
            to:      config.adminEmail,
            subject: subject,
            body:    "Error Log: \n" + error
        };

        nodemailer.send_mail(mail, function(err, success) {
            if (err || !success) {
                util.log("Error: Sending email to '" + config.adminEmail + "' failed!");
            }
        });
    }
}

