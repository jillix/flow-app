var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    stat = require("node-static").Server,
    model = require(CONFIG.root + "/core/model/orient.js"),
    client = new stat(CONFIG.root + "/core/client"),
    modules = new stat(CONFIG.root + "/modules");

function buildComp(module) {
    
    var response = [
        
        module.config || {},
        module.html || ""
    ];
    
    if (module.css) {
        
        response[2] = [];
        
        // add the module css in the third response object
        for (var i in module.css) {
        
            // TODO append D/ for domain css and M/ for module css
            response[2].push(module.css[i] + ".css");
        }
    }
    
    return response;
}

exports.getConfig = function(link) {
    
    // get the module instance id
    var miid = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        appid = link.host[1] + "." + link.host[0];
    
    model.getModuleConfig(appid, miid, link.session.uid, function(err, module) {
        
        // error checks
        if (err || !module) {
            send.notfound(link, err || "No module found");
            return;
        }
        
        if (module.html) {
        
            // TODO this is duplicate directory name in the same file
            // try some refactoring or a config option
            // TODO get html from module directory
            read("/apps/" + appid + "/" + module.html + ".html", "utf8", function(err, html) {

                if (err) {

                    // TODO let the module define it's missing module placeholder
                    html = "<p>An error occurred while retrieving this module HTML.</p>";

                    if (CONFIG.dev) {
                        html += "<p>Error: " + err + "</p>"
                    }
                }

                module.html = html;
                
                send.ok(link.res, buildComp(module));
            });
        }
        else {
            
            send.ok(link.res, buildComp(module));
        }
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
    var miid = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        appid = link.host[1] + "." + link.host[0];
    
    // the module name must be almost alphanumeric
    if (miid.length != link.path[0].length) {
        send.badrequest(link, "Incorrect module instance in request URL");
        return;
    }
    
    // find the module in the database
    model.getModuleFile(appid, miid, link.session.uid, function(err, module) {
        
        // error checks
        if (err || !module) {
            send.notfound(link, err || ("Could not find module: " + miid));
            return;
        }
        
        // now serve the module file
        link.req.url = module.owner + "/" + module.name + "/" + (module.dir ? module.dir + "/" : "") + link.path.slice(2).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        
        modules.serve(link.req, link.res);
    });
};

exports.getClient = function(link){
    
    link.req.url = link.path[0];
    
    client.serve(link.req, link.res);
};

/*exports.getFile = function(link) {
    
    var externalUrl = link.req.url;
    
    if (link.params && link.params.dir) {

        // change the request URL to the internal one
        link.req.url = link.params.dir + link.path.slice(2).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        
        files.serve(link.req, link.res, function(err, data) {

            // TODO one can hook stats in here
            if (!err) return;

            switch (err.status) {
                case 404:
                    send.notfound(link, "File not found: " + externalUrl);
                    return;
                default:
                    send.internalservererror(link, err);
            }
        });
    }
    else {
        send.forbidden(link);
    }
};*/
