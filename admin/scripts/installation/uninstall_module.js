// the mono configuration as global object
CONFIG = require(process.cwd() + "/lib/config");

var orient = require(CONFIG.root + "/lib/db/orient");
var server = require(CONFIG.root + "/api/server");
var mods = require(CONFIG.root + "/api/modules");

if (!CONFIG.argv || !CONFIG.argv.length) {
    console.error("Please provide a web path format (e.g. 'github/adioo/bind/v0.2.0') as argument.");
    process.exit(1);
}

var webPath = CONFIG.argv[0].toString();
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
var module = new mods.Module(source, owner, name, version);

// connect to the orient server first
orient.connect(CONFIG.orient, function(err) {

    if (err) {
        console.error(err);
        console.error("Failed to connect to OrientDB");
        process.exit(3);
    }

    mods.uninstallModule(module, function(err) {

        if (err) {
            console.error(err);
            console.error("Failed to uninstall module: " + module.getVersionPath());
            process.exit(4);
        }

        console.log("Succesfully uninstalled module: " + module.getVersionPath());

        // and now close the orient connection
        orient.disconnect(CONFIG.orient);
    });
});

