var stat = require("node-static").Server;
var client = new stat(M.config.root + "/lib/client");
var modules = new stat(M.config.root + "/apps/" + M.config.app.id + "/mono_modules");

var configCache = {};

exports.getConfig = function(link) {

    // get the module instance id
    var miid = link.path[0] ? link.path[0].replace(/[^0-9a-z_\-\.]/gi, "") : null;

    if (!miid) {
        return link.send(400, "No miid defined");
    }
    
    // send no cache headers IE bug
    link.res.headers["cache-control"] = "no-cache";
    
    var getModuleConfig = function(miid) {
        
        M.module.getConfig(M.config.app.id, miid, link.session.uid, function(err, module) {

            // error checks
            if (err || !module) {
                return link.send(200, { type: "text", data: "No such module found: " + miid });
            }
            
            // prepare config cache
            if (!configCache[link.host]) {
                configCache[link.host] = {};
            }
            
            var response = module.config || {};

            response.path = module.source + "/" + module.owner + "/" + module.name + "/" + module.version;
            // TODO is maybe another solution to let modules also define their language?
            //response.lang = link.session.loc || module.lang || "en";
            response.role = link.session.role;

            if (module.config && module.config.html) {
                
                // get module from app folder
                var path = "/apps/" + M.config.app.id + "/";

                // get module from module folder
                if (module.config.html.type == "m") {
                    path += "mono_modules/" + module.source + "/" + module.owner + "/" + module.name + "/" + module.version + "/";
                }

                var pathAll = path + module.config.html.path + ".html";
                var pathLang = path + module.config.html.path + (link.lang === "*" ? "" : "." + link.lang) + ".html";

                var setModuleHtml = function(err, html) {

                    if (err) {
                        // TODO let the module define it's missing module placeholder
                        html = "<p>An error occurred while retrieving this module HTML.</p>";
                        if (M.config.logLevel == "debug") {
                            html += "<p>Error: " + err + "</p>"
                        }
                    }
                    
                    response.html = html;
                    
                    configCache[link.host][miid] = response;
                    return link.send(200, { type: "config", data: response });
                };

                M.util.read(pathLang, "utf8", function(err, html) {

                    if (err) {
                        if (link.lang !== "*") {
                            M.util.read(pathAll, "utf8", setModuleHtml);
                            return;
                        }
                    }
                    
                    setModuleHtml(err, html);
                });
            }
            else {
                configCache[link.host][miid] = response;
                return link.send(200, { type: "config", data: response });
            }
        });
    };
    
    // send cached config
    if (configCache[link.host] && configCache[link.host][miid]) {
        return link.send(200, {type: "config", data: configCache[link.host][miid]});
    }
    
    getModuleConfig(miid);
};

// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || !link.path[0] || !link.path[1] || !link.path[2] || !link.path[3]) {
        return link.send(400, "Incorrect module request URL format");
    }
    
    // get the module instance id
    var source = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        owner = link.path[1].replace(/[^0-9a-z_\-\.]/gi, ""),
        name = link.path[2].replace(/[^0-9a-z_\-\.]/gi, ""),
        version = link.path[3].replace(/[^0-9a-z_\-\.]/gi, ""),
        path = link.path.slice(4).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

    // the module name must be almost alphanumeric
    if (source.length != link.path[0].length || owner.length != link.path[1].length || name.length != link.path[2].length || version.length != link.path[3].length) {
        return link.send(400, "Incorrect data in module request URL");
    }

    // find the module in the database
    M.module.getFile(source, owner, name, link.session.uid, function(err, module) {

        // error checks
        if (err || !module) {
            return link.send(404, err || ("Could not find module: " + miid));
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
