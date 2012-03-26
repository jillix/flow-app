var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    getComp = require(CONFIG.root + "/core/model/orient.js").getComponent,
    files = new (require("node-static").Server)(CONFIG.root + "/files/domains");


function buildComp(response, module) {

    // add the module config in the first response object
    var r0 = response[0];
    r0[module.module] = r0[module.module] || [];
    r0[module.module].push(module.config || {});
    
    // add the module css in the third response object
    for (var i in module.css) {
        response[2].push(module.css[i] + ".css");
    }
}


exports.getComp = function(link) {

    getComp(link.path[2], link.session.uid, function(err, modules) {

        // error checks
        if (err || !modules) {
            send.notfound(link, err || "The component has no modules");
            return;
        }

        var response = [
            // configs
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

