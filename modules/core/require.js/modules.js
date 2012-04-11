var send = require(CONFIG.root + "/core/send.js" ).send,
    getModule = require(CONFIG.root + "/core/model/orient.js").getModule,
    StaticServer = require("node-static" ).Server,
    modules = new StaticServer(CONFIG.root + "/modules");


// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || typeof link.path[2] == "undefined" || typeof link.path[3] == "undefined") {
        send.badrequest(link, "Module name missing");
        return;
    }

    // get the module owner name from the URL
    var ownerName = link.path[2].replace(/[^0-9a-z_\-\.]/gi, "");
    // get the module name from the URL
    var moduleName = link.path[3].replace(/[^0-9a-z_\-\.]/gi, "");

    // the module name must be almost alphanumeric
    if (ownerName.length != link.path[2].length || moduleName.length != link.path[3].length) {
        send.badrequest(link, "Incorrect module name in request URL");
        return;
    }

    // find the module in the database
    getModule(ownerName, moduleName, link.session.uid, function(err, module) {

        // TODO move check in the model and return a valid module
        var module = module[0];

        // error checks
        if (err || !module || !module.name) {
            send.notfound(link, err || ("Could not find module: " + ownerName + "/" + moduleName));
            return;
        }

        // now serve the module file
        link.req.url = module.owner + "/" + module.name + "/" + (module.dir || "") + "/" + link.path.slice(4).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        modules.serve(link.req, link.res);
    });
};

