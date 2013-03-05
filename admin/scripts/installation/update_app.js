// the mono configuration as global object
CONFIG = require(process.cwd() + "/config.js");

var apps = require(CONFIG.root + "/api/apps");
var spawn = require("child_process").spawn;

var fs = require("fs");

if (!CONFIG.argv || !CONFIG.argv.length) {
    console.error("Please provide a descriptor file as argument.");
    process.exit(1);
    return;
}


var appPath = CONFIG.argv[0];
var appConfig = require(appPath + "/mono.json");

// TODO: Find a relation between .git url and .zip url. This works for Github only.
var appUrl = appConfig.repository.url.replace(".git", "/archive/master.zip");

var downloadDirectory = appPath + "/temp";
var zipPath = downloadDirectory + "/app.zip";

console.log("Application path: " + appPath);
console.log("Repository name: " + appUrl)

// Make the temp directory
var mkDir = spawn("mkdir", ["-p", downloadDirectory]);
mkDir.stderr.pipe(process.stderr);
mkDir.stdout.pipe(process.stdout);

mkDir.on("exit", function(code) {
    if (code) {
        console.error("Failed to make temp directory. Error code: " + code);
        process.exit(code);
    }
    else {
        console.log("Succesfully created temp directory: " + downloadDirectory);
        
        // Download the repository as zip into temp directory.
        var downloader = spawn("wget", ["--no-check-certificate", "-O", zipPath, appUrl]);

        downloader.stderr.pipe(process.stderr);
        downloader.stdout.pipe(process.stdout);

        // Download finished
        downloader.on("exit", function(code) {
            // There was a problem
            if (code) {
                console.error("Update failed with code: " + code);
                process.exit(code);
            } 
            // No problem
            else {
                console.log("ZIP file successfully downloaded in " + zipPath);

                var env = process.env;
                env.MONO_ROOT = CONFIG.root;
                
                // Deploy the zip file
                var depl_app = spawn(CONFIG.root + "/admin/scripts/installation/deploy_app.sh", [zipPath], { env: env });

                var output = "";

                depl_app.stdout.on("data", function(data) {
                    console.log(data.toString().trim());
                    output += data.toString();
                });
                depl_app.stderr.on("data", function(data) {
                    console.error(data.toString().trim());
                    output += data.toString();
                });

                depl_app.on("exit", function(code){
                
                    if (code == 0) {
                        // TODO improve this appId reading (probably get it through other means)
                        // (add all output to a -v option and only print ID at the end)
                        var splits = output.trim().split("\n");
                        var lastLine = splits[splits.length - 1];
                        var tokens = lastLine.trim().split(" ");
                        var appId = tokens[tokens.length - 1];

                        apps.getApplication(appId, function(err, app) {

                            if (err) {
                                send.internalservererror(link, "The application was not found in the databse. Application deployment failed somehow. :(");
                                return;
                            }

                            apps.getApplicationDomains(appId, function(err, domains) {

                                if (err) {
                                    send.internalservererror(link, err);
                                    return;
                                }

                                var domain = null;

                                for (var i in domains) {
                                    if (domains[i].indexOf("mono.ch") !== -1) {
                                        continue;
                                    }
                                    domain = domains[i];
                                    break;
                                }

                                var result = {
                                    name: app.name,
                                    size: 0,
                                    type: "text/html",
                                    delete_type: "DELETE",
                                    delete_url: "http://dev.mono.ch:8000/@/dev_deployer/remove/00000000000000000000000000000002",
                                    url: domain ? "http://" + domain + "/" : "#"
                                };

                                send.ok(link.res, [result]);
                            });
                        });
                    }
                    else {
                        send.internalservererror(link, ":{ :( :[");
                    }
                    
                    var deleteZipFile = spawn("rm", ["-rf", downloadDirectory]);
                    deleteZipFile.stderr.pipe(process.stderr);
                    deleteZipFile.stdout.pipe(process.stdout);
                    
                    process.exit();
                });
            }
        });
    } 
});
