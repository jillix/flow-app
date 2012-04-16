var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    stat = require("node-static").Server,
    model = require(CONFIG.root + "/core/model/orient.js"),
    files = new stat(CONFIG.root + "/files/domains"),
    modules = new stat(CONFIG.root + "/modules");

function buildComp(response, module) {

    // add the module config in the first response object
    var r0 = response[0],
        key = module.owner + "/" + module.module;

    r0[key] = r0[key] || [];
    r0[key].push(module.config || {});
    
    // add the module css in the third response object
    for (var i in module.css) {
        response[2].push(module.css[i] + ".css");
    }
}

exports.getConfig = function(link) {

    model.getModuleConfig(link.path[1], link.path[2], link.session.uid, function(err, module) {

        // error checks
        if (err || !module) {
            send.notfound(link, err || "The component has no modules");
            return;
        }

        // TODO ab hier
        var response = [
            // modules & configs
            {},
            // html
            "",
            // styles
            []
        ];

        var length = modules.length;

        var next = function(i) {

            if (i >= length) {
                send.ok(link.res, response);
                return;
            }

            if (modules[i].html) {

                // TODO this is duplicate directory name in the same file
                // try some refactoring or a config option
                // TODO get html from module directory
                read("/files/domains/" + modules[i].html + ".html", "utf8", function(err, html) {

                    if (err) {

                        // TODO let the module define it's missing module placeholder
                        html = "<p>An error occurred while retrieving this module HTML.</p>";

                        if (CONFIG.dev) {
                            html += "<p>Error: " + err + "</p>"
                        }
                    }

                    response[1] += html;
                    buildComp(response, modules[i]);

                    next(++i);
                });
            }
            else {
                buildComp(response, modules[i]);
                next(++i);
            }
        };
            
        next(0, modules.length);
    });
};

// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || typeof link.path[1] == "undefined" || typeof link.path[2] == "undefined") {
        send.badrequest(link, "Module name missing");
        return;
    }

    // get the module owner name from the URL
    var ownerName = link.path[4].replace(/[^0-9a-z_\-\.]/gi, "");
    // get the module name from the URL
    var moduleName = link.path[5].replace(/[^0-9a-z_\-\.]/gi, "");

    // the module name must be almost alphanumeric
    if (ownerName.length != link.path[4].length || moduleName.length != link.path[5].length) {
        send.badrequest(link, "Incorrect module name in request URL");
        return;
    }

    // find the module in the database
    model.getModuleFile(ownerName, moduleName, link.session.uid, function(err, module) {
        
        // error checks
        if (err || !module || !module.name) {
            send.notfound(link, err || ("Could not find module: " + ownerName + "/" + moduleName));
            return;
        }

        // now serve the module file
        link.req.url = module.owner + "/" + module.name + "/" + (module.dir || "") + link.path.slice(6).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        
        modules.serve(link.req, link.res);
    });
};

exports.getFile = function(link) {

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
};
