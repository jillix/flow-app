// load mono api
require(process.cwd() + '/api');

var orient = M.orient;
var dir = M.dir;
var mods = M.module;

var fs = require("fs");

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

    dir.readDescriptor(descriptorPath, function(err, descriptor) {

        if (err) {
            console.error("Invalid or inaccessible module descriptor: " + descriptorPath)
            process.exit(5);
        }

        // build the module object for the API
        var module = new mods.Module(descriptor.source, descriptor.owner, descriptor.name, version);
        module.local = path;

        // now install
        install(module);
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
    var module = new mods.Module(source, owner, name, version);

    // now install
    install(module);
}

function install(module) {

    // connect to the orient server first
    orient.connect(M.config.orient, function(err) {

        if (err) {
            console.error(err);
            console.error("Failed to connect to OrientDB");
            process.exit(10);
        }

        // choose different linstallation type for local modules
        var installType = module.local ? mods.installLocalModule : mods.installModule;

        installType(module, function(err) {

            if (err) {
                console.error(err);
                console.error("Failed to install module: " + module.getVersionPath() + (module.local ? " from path " + module.local : ""));
                process.exit(6);
            }

            console.log("Succesfully installed module: " + module.getVersionPath());

            // and now close the orient connection
            orient.disconnect(M.config.orient);
        });
    });

}

