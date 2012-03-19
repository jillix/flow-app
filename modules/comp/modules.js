var send = require(CONFIG.root + "/core/send.js" ).send,
    getModule = require(CONFIG.root + "/core/model/orient.js").getModule,
    StaticServer = require("node-static" ).Server,
    modules = new StaticServer(CONFIG.root + "/modules");


// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || typeof link.path[2] == "undefined") {
        send.badrequest(link, "Module name missing");
        return;
    }

    // get the module name from the URL
    var module = link.path[2].replace(/[^0-9a-z_\-]/gi, "");

    // the module name must be almost alphanumeric
    if (module === "") {
        send.badrequest(link, "Incorrect module name in request URL");
        return;
    }

    // find the module in the database
    getModule(module, link.session.uid, function(err, res) {

        // error checks
        if (err || !res || !res.module) {
            send.notfound(link, err || ("Could not find module: " + module));
            return;
        }

        // now serve the module file
        link.req.url = res.module + (res.dir || "") + "/" + link.path.slice(3).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        modules.serve(link.req, link.res);
    });
};

