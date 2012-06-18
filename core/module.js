var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    stat = require("node-static").Server,
    model = require(CONFIG.root + "/core/model/orient.js"),
    client = new stat(CONFIG.root + "/core/client"),
    modules = new stat(CONFIG.root + "/modules"),
    publicFiles = require(CONFIG.root + "/core/send").publicFiles;


function buildModule(link, module) {

    var response = {
        0: module.owner,
        1: module.name + "/" + module.version,
        2: link.session.loc || "en"
    };

    if (module.config) {
        response[3] = module.config;
    }

    if (module.html) {
        response[4] = module.html;
    }

    if (module.css) {

        response[5] = [];

        // add the module css in the third response object
        for (var i in module.css) {

            // TODO append D/ for domain css and M/ for module css
            response[5].push(module.css[i] + ".css");
        }
    }
    
    return response;
}

exports.getConfig = function(link) {

    // get the module instance id
    var miid = link.path[0] ? link.path[0].replace(/[^0-9a-z_\-\.]/gi, "") : null,
        errMiid = link.path[1] ? link.path[1].replace(/[^0-9a-z_\-\.]/gi, "") : null;

    if (!miid) {
        send.badrequest(link, "No miid defined");
        return;
    }

    model.getAppId(link.host, function(err, appid) {

        if (err || !appid) {
            send.internalservererror(link, err || "Missing appid");
            return;
        }

        var getModuleConfig = function(miid) {

            model.getModuleConfig(appid, miid, link.session.uid, function(err, module) {

                // error checks
                // TODO what if the user defines an error module but there is an error retrieveing the module?
                //      this will cause: RangeError: Maximum call stack size exceeded
                //      because getModuleConfig() will always be called
                if (err || !module) {

                    if (errMiid) {
                        getModuleConfig(errMiid);
                        return;
                    }

                    send.notfound(link, err || "No module found");
                    return;
                }

                if (module.html) {

                    var path = (module.html.type === "a" ? "/apps/" + appid : "/modules/" + module.owner + "/" + module.name + "/" + module.version) + "/" + module.html.path + ".html";

                    read(path, "utf8", function(err, html) {

                        if (err) {

                            // TODO let the module define it's missing module placeholder
                            html = "<p>An error occurred while retrieving this module HTML.</p>";

                            if (CONFIG.dev) {
                                html += "<p>Error: " + err + "</p>"
                            }
                        }

                        module.html = html;

                        send.ok(link.res, buildModule(link, module));
                    });
                }
                else {

                    send.ok(link.res, buildModule(link, module));
                }
            });
        };

        getModuleConfig(miid);
    });
};

// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || typeof link.path[0] == "undefined" || typeof link.path[1] == "undefined") {
        send.badrequest(link, "Module name missing");
        return;
    }
    
    // get the module instance id
    var owner = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        name = link.path[1].replace(/[^0-9a-z_\-\.]/gi, ""),
        version = link.path[2].replace(/[^0-9a-z_\-\.]/gi, ""),
        path = link.path.slice(3).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

    // the module name must be almost alphanumeric
    if (owner.length != link.path[0].length || name.length != link.path[1].length) {
        send.badrequest(link, "Incorrect module instance in request URL");
        return;
    }

    // find the module in the database
    model.getModuleFile(owner, name, version, link.session.uid, function(err, module) {

        // error checks
        if (err || !module) {
            send.notfound(link, err || ("Could not find module: " + miid));
            return;
        }

        // now serve the module file
        link.req.url = owner + "/" + name + "/" + version + "/" + (module.dir ? module.dir + "/" : "") + path;

        modules.serve(link.req, link.res);
    });
};

exports.getClient = function(link){

    link.req.url = link.path[0];

    client.serve(link.req, link.res);
};

// ONLY PUBLIC FILES
exports.getFile = function(link) {

    model.getDomainApplication(link.host, false, function(err, result) {

        if (err || !result) {

            send.notfound(link, "File not found: " + link.req.url);
            return;
        }

        publicFiles(link, result.appId, result.publicDir);
    });
};
