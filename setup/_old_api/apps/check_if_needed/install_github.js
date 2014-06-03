// the mono configuration as global object
CONFIG = require(process.cwd() + "/config.js");

var apps = require(CONFIG.root + "/api/apps");
var spawn = require("child_process").spawn;

var fs = require("fs");

if (!CONFIG.argv || !CONFIG.argv.length) {
    console.error("Please provide a repository path as argument.");
    process.exit(1);
}

var repositoryPath = CONFIG.argv[0];
var appZipUrl = repositoryPath.replace(".git", "/archive/master.zip");

var downloadDirectory = CONFIG.root + "/temp";
var zipPath = downloadDirectory + "/app.zip";

// Make the temp directory
var mkDir = spawn("mkdir", ["-p", downloadDirectory]);
mkDir.stderr.pipe(process.stderr);
mkDir.stdout.pipe(process.stdout);

mkDir.on("exit", function(code) {
    if (code) {
        console.error("Failed to make temp directory.");
        process.exit(2);
    }
    else {
        console.log("Succesfully created temp directory: " + downloadDirectory);

        // Download the repository as zip into temp directory.
        var downloader = spawn("wget", ["--no-check-certificate", "-O", zipPath, appZipUrl]);

        downloader.stderr.pipe(process.stderr);
        downloader.stdout.pipe(process.stdout);

        // Download finished
        downloader.on("exit", function(code) {
            // There was a problem
            if (code) {
                console.error("Download app as zip failed with code: " + code);
                process.exit(3);
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

                    if (code) {
                        console.error("Application deployement failed with error code: " + code + ".");
                        process.exit(4);
                    }
                    else {
                        console.log("Applications installed successfully.");
                        process.exit();
                    }

                    // Delete zip file directory
                    var deleteZipFile = spawn("rm", [zipPath]);
                    deleteZipFile.stderr.pipe(process.stderr);
                    deleteZipFile.stdout.pipe(process.stdout);

                    deleteZipFile.on("exit", function(code) {
                        if (code) {
                            console.log("Failed to delete zip file.");
                        }
                        else {
                            console.log("The zip file from temp directory was successfully deleted.");
                        }
                    });
                });
            }
        });
    }
});
