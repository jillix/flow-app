var send = require(CONFIG.root + "/core/send.js").send;
var read = require(CONFIG.root + "/core/util.js").read;
var stat = require("node-static").Server;
var model = require(CONFIG.root + "/core/model/orient.js");
var client = new stat(CONFIG.root + "/core/client");
var modules = new stat(CONFIG.root + "/apps/" + CONFIG.app + "/mono_modules");


exports.getConfig = function(link) {

    // get the module instance id
    var miid = link.path[0] ? link.path[0].replace(/[^0-9a-z_\-\.]/gi, "") : null;

    if (!miid) {
        send.badrequest(link, "No miid defined");
        return;
    }
    
    // send no cache headers IE bug
    link.res.headers["cache-control"] = "no-cache";
    
    model.getAppId(link.host, function(err, appid, errMiid) {

        if (err || !appid) {
            send.internalservererror(link, err || "Missing appid");
            return;
        }

        var getModuleConfig = function(miid) {

            model.getModuleConfig(appid, miid, link.session.uid, function(err, module) {

                // error checks
                if (err || !module) {
                    if (errMiid) {
                        send.ok(link.res, { type: "miid", data: errMiid });
                    } else {
                        send.ok(link.res, { type: "text", data: "No such module found: " + miid });
                    }
                    return;
                }

                var response = module.config || {};
                
                response.path = module.source + "/" + module.owner + "/" + module.name + "/" + module.version;
                response.lang = link.session.loc || module.lang || "en";
                response.role = link.session.role;

                if (module.config && module.config.html) {
                    
                    // get module from app folder
                    var path = "/apps/" + appid + "/";
                    
                    // get module from module folder
                    if (module.config.html.type == "m") {
                        
                        path += "mono_modules/" + module.source + "/" + module.owner + "/" + module.name + "/" + module.version + "/";
                    }
                    
                    path += module.config.html.path + ".html";
                    
                    read(path, "utf8", function(err, html) {

                        if (err) {

                            // TODO let the module define it's missing module placeholder
                            html = "<p>An error occurred while retrieving this module HTML.</p>";

                            if (CONFIG.logLevel == "debug") {
                                html += "<p>Error: " + err + "</p>"
                            }
                        }
                        
                        response.html = html;

                        send.ok(link.res, { type: "config", data: response });
                    });
                }
                else {
                    send.ok(link.res, { type: "config", data: response });
                }
            });
        };

        getModuleConfig(miid);
    });
};

// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || !link.path[0] || !link.path[1] || !link.path[2] || !link.path[3]) {
        send.badrequest(link, "Incorrect module request URL format");
        return;
    }
    
    // get the module instance id
    var source = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        owner = link.path[1].replace(/[^0-9a-z_\-\.]/gi, ""),
        name = link.path[2].replace(/[^0-9a-z_\-\.]/gi, ""),
        version = link.path[3].replace(/[^0-9a-z_\-\.]/gi, ""),
        path = link.path.slice(4).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

    // the module name must be almost alphanumeric
    if (source.length != link.path[0].length || owner.length != link.path[1].length || name.length != link.path[2].length || version.length != link.path[3].length) {
        send.badrequest(link, "Incorrect data in module request URL");
        return;
    }

    // find the module in the database
    model.getModuleFile(source, owner, name, link.session.uid, function(err, module) {

        // error checks
        if (err || !module) {
            send.notfound(link, err || ("Could not find module: " + miid));
            return;
        }

        // now serve the module file
        link.req.url = source + "/" + owner + "/" + name + "/" + version + "/" + (module.dir ? module.dir + "/" : "") + path;

        modules.serve(link.req, link.res);
    });
};

exports.getClient = function(link){

    link.req.url = link.path[0];

    client.serve(link.req, link.res);
};
