var fs = require("fs");

function installApp () {
    
    if (!M.config.argv || !M.config.argv.length) {
        console.error("Please provide a descriptor file as argument.");
        process.exit(1);
        return;
    }
    
    // TODO allow multiple application installs
    if (M.config.argv.length > 1) {
        var apps = "";
        for (var i in M.config.argv) {
            apps += M.config.argv[i] + ", ";
        }
        apps = apps.slice(0, -2);
    
        console.error("Currently I can only install one application. You provided " + M.config.argv.length + ": " + apps);
        process.exit(2);
        return;
    }
    
    M.app.install(M.config.argv[0], function(err, descriptor) {
    
        if (err) {
            console.error(err);
            console.error("Failed to install application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
            process.exit(2);
            return;
        }
        
        console.log("Succesfully installed application: " + descriptor.appId);
        process.exit();
    });
}

function _installModule (module) {

    // connect to the oriient server first
    M.oriient.connect(function(err) {

        if (err) {
            console.error(err);
            console.error("Failed to connect to OriientDB");
            process.exit(10);
        }

        // choose different linstallation type for local modules
        var installType = module.local ? M.module.installLocalModule : M.module.installModule;

        installType(module, function(err) {

            if (err) {
                console.error(err);
                console.error("Failed to install module: " + module.getVersionPath() + (module.local ? " from path " + module.local : ""));
                process.exit(6);
            }

            console.log("Succesfully installed module: " + module.getVersionPath());
        });
    });
}

function installModule () {

    if (!M.config.argv || !M.config.argv.length) {
        console.error("Please provide a module directory path or web path format (e.g. 'github/adioo/bind/v0.2.0') as argument.");
        process.exit(1);
    }
    
    // this means install a local module
    if (M.config.argv.length == 2) {
        var path = M.config.argv[0].toString();
        var version = M.config.argv[1].toString();
    
        if (!path) {
            console.error("Invalid module directory path: " + path);
            process.exit(2);
        }
    
        var descriptorPath = path + "/mono.json";
        if (!fs.existsSync(descriptorPath)) {
            console.error("Module descriptor path is not accessible: " + descriptorPath);
            process.exit(3);
        }
        path = fs.realpathSync(path);
        descriptorPath = path + "/mono.json"
    
        if (!version) {
            console.error("Invalid module version: " + version);
            process.exit(4);
        }
    
        M.dir.readDescriptor(descriptorPath, function(err, descriptor) {
    
            if (err) {
                console.error("Invalid or inaccessible module descriptor: " + descriptorPath)
                process.exit(5);
            }
    
            // build the module object for the API
            var module = new M.module.Module(descriptor.source, descriptor.owner, descriptor.name, version);
            module.local = path;
    
            // now install
            _installModule(module);
        });
    }
    
    // otherwise it must be a web version path (on GitHub, BitBucket, etc.)
    else {
        var webPath = M.config.argv[0].toString();
        var splits = webPath.split("/");
        if (splits.length != 4) {
            console.error("Invalid module version web path. This must be look like: source/owner/name/version");
            process.exit(7);
        }
    
        var source = splits[0];
        var owner = splits[1];
        var name = splits[2];
        var version = splits[3];
    
        if (source !== "github" && source != "bitbucket") {
            console.error("Invalid module source. Currently only 'github' and 'bitbucket' are accepted.");
            process.exit(8);
        }
        if (!owner || !name || !version) {
            console.error("Invalid module owner, name, or version.");
            process.exit(9);
        }
    
        // build the module object for the API
        var module = new M.module.Module(source, owner, name, version);
    
        // now install
        _installModule(module);
    }
}

function reinstallApp (appId, callback) {

    if (!appId) {
        return callback("Please provide a descriptor file as argument.");
    }
    
    var descriptor = M.config.APPLICATION_ROOT + "/" + appId + "/mono.json";
    
    // TODO allow multiple application uninstalls
    M.app.uninstall(descriptor, function(err, descriptor) {
        
        if (err) {
            return callback(err);
        }
        
        console.log("Succesfully uninstalled application: " + descriptor.appId);
    
        M.app.install(descriptor, function(err, descriptor) {
    
            if (err) {
                return callback(err);
            }
            
            console.log("Succesfully installed application: " + descriptor.appId);
            callback();
        });
    });
}

function uninstallApp () {
    
    if (!M.config.argv || !M.config.argv.length) {
        console.error("Please provide a descriptor file as argument.");
        process.exit(1);
        return;
    }
    
    // TODO allow multiple application uninstalls
    if (M.config.argv.length > 1) {
        var apps = "";
        for (var i in M.config.argv) {
            apps += M.config.argv[i] + ", ";
        }
        apps = apps.slice(0, -2);
    
        console.error("Currently I can only uninstall one application. You provided " + M.config.argv.length + ": " + apps);
        process.exit(2);
        return;
    }
    
    M.app.uninstall(M.config.argv[0], function(err, descriptor) {
    
        if (err) {
            console.error(err);
            console.error("Failed to uninstall application" + (descriptor && descriptor.appId ? ": " + descriptor.appId : ""));
            process.exit(2);
            return;
        }
    
        console.log("Succesfully uninstalled application: " + descriptor.appId);
        process.exit();
    });
}

function uninstallModule () {
    
    if (!M.config.argv || !M.config.argv.length) {
        console.error("Please provide a web path format (e.g. 'github/adioo/bind/v0.2.0') as argument.");
        process.exit(1);
    }
    
    var webPath = M.config.argv[0].toString();
    var splits = webPath.split("/");
    if (splits.length != 4) {
        console.error("Invalid module version web path. This must be look like: source/owner/name/version");
        process.exit(7);
    }
    
    var source = splits[0];
    var owner = splits[1];
    var name = splits[2];
    var version = splits[3];
    
    if (source !== "github" && source != "bitbucket") {
        console.error("Invalid module source. Currently only 'github' and 'bitbucket' are accepted.");
        process.exit(1);
    }
    if (!owner || !name || !version) {
        console.error("Invalid module owner, name, or version.");
        process.exit(2);
    }
    
    // build the module object for the API
    var module = new M.module.Module(source, owner, name, version);
    
    // connect to the oriient server first
    M.oriient.connect(function(err) {
    
        if (err) {
            console.error(err);
            console.error("Failed to connect to OriientDB");
            process.exit(3);
        }
    
        M.module.uninstallModule(module, function(err) {
    
            if (err) {
                console.error(err);
                console.error("Failed to uninstall module: " + module.getVersionPath());
                process.exit(4);
            }
    
            console.log("Succesfully uninstalled module: " + module.getVersionPath());
        });
    });
}

// recursive function to serialize the application installation
function _installApp(descriptorFiles, i) {
    
    if (i < descriptorFiles.length) {

        console.log("-------------------");
        console.log("Installing application: " + descriptorFiles[i]);

        M.app.install(descriptorFiles[i], function(err, descriptor) {

            if (err) {
                console.error(err);
                console.error("Failed to install application: " + descriptor.appId);
            } else {
                console.log("Succesfully installed application: " + descriptor.appId);
            }

            // install the next application
            _installApp(descriptorFiles, ++i);
        });
    }
}

function installApps () {
    
    var apps = fs.readdirSync(M.config.APPLICATION_ROOT);
    var descriptorFiles = [];
    
    for (var i in apps) {
    
        var appId = apps[i];
        var monoJson = M.config.APPLICATION_ROOT + appId + "/mono.json";
    
        if (appId.length == 32 && fs.existsSync(monoJson)) {
            descriptorFiles.push(monoJson);
        }
    }
    
    // start the installation of all apps
    _installApp(descriptorFiles, 0);
}

function updateApp (appId, callback) {
    
    var spawn = require("child_process").spawn;
    var fs = require("fs");
    
    if (!appId) {
        return callback("Please provide an application id as argument.");
    }
    
    var appPath = M.config.APPLICATION_ROOT + '/' + appId;
    var appConfig = require(appPath + "/mono.json");
    
    // TODO: Find a relation between .git url and .zip url. This works for Github only.
    if (!appConfig.repository) {   
        return callback("This application doesn't contain the repository field.");
    }
    
    if(!appConfig.repository.url) {
        return callback("This application doesn't contain the repository.url field.");
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
                    env.MONO_ROOT = M.config.root;
                    
                    // Deploy the zip file
                    var depl_app = spawn(M.config.root + "/admin/scripts/installation/deploy_app.sh", [zipPath], { env: env });
    
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
                            M.oriient.connect(function(err) {
                                if (err) {
                                    console.error(err);
                                    console.error("Failed to connect to OriientDB");
                                    process.exit(8);
                                }
    
                                // Verify if the app id exists in database
                                M.app.getApplication(appId, function(err) {
                                    if (err) {
                                        console.error("The ID doesn't exist in database. Update failed.");
                                        process.exit(9);
                                    }
                                    else {
                                        process.exit();
                                    }
                                });
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
}

exports.installApps = installApps;
exports.installApp = installApp;
exports.installModule = installModule;
exports.reinstallApp = reinstallApp;
exports.uninstallApp = uninstallApp;
exports.uninstallModule = uninstallModule;
exports.updateApp = updateApp;
