// the mono configuration as global object
CONFIG = require(process.cwd() + "/config.js");

var apps = require(CONFIG.root + "/api/apps");
var spawn = require("child_process").spawn;
var orient = require(CONFIG.root + "/core/db/orient");

var fs = require("fs");

if (!CONFIG.argv || !CONFIG.argv.length) {
    console.error("Please provide an application id as argument.");
    process.exit(1);
}

var appPath = CONFIG.argv[0];
var appConfig = require(appPath + "/mono.json");

// TODO: Find a relation between .git url and .zip url. This works for Github only.
if (!appConfig.repository) {   
    console.error("This application doesn't contain the repository field.");
    process.exit(2);
}
else {
    if(!appConfig.repository.url) {
        console.error("This application doesn't contain the repository.url field.");
        process.exit(3);
    }
}

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
        console.error("Failed to make temp directory.");
        process.exit(4);
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
                console.error("Download app failed with code: " + code);
                process.exit(5);
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
                
                // Deployement is finished
                depl_app.on("exit", function(code){
                    var deployedMessage = "Succesfully deployed application";
                    var appId = output.substring(output.indexOf(deployedMessage) + deployedMessage.length).trim();

                    console.log("NEW APP ID: " + appId);
                
                    if (code) {
                        console.error("Application updating failed with error code: " + code + " at deployement.");
                        process.exit(7);
                    }
                    else {
                        orient.connect(CONFIG.orient, function(err) {
                            if (err) {
                                console.error(err);
                                console.error("Failed to connect to OrientDB");
                                process.exit(8);
                            }

                            // Verify if the app id exists in database
                            apps.getApplication(appId, function(err) {
                                if (err) {
                                    console.error("The ID doesn't exist in database. Update failed.");
                                    process.exit(9);
                                }
                                else {
                                    process.exit();
                                }
                            });

                            // and now close the orient connection
                            orient.disconnect(CONFIG.orient);
                        });                        
                    }

                    // Delete zip file directory
                    var deleteZipFile = spawn("rm", ["-rf", downloadDirectory]);
                    deleteZipFile.stderr.pipe(process.stderr);
                    deleteZipFile.stdout.pipe(process.stdout);
                    
                    deleteZipFile.on("exit", function(code) {
                        if (code) {
                            console.log("Failed to delete zip file.");
                        }
                        else {
                            console.log("The temp directory was successfully deleted.");
                        }
                    });
                });
            }
        });
    } 
});