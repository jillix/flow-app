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
    if (module.css) {
        response[2].push(module.css + ".css");
    }
}


exports.getComp = function(link) {

    getComp(link.path[2], link.session.uid, function(err, modules) {

        // error checks
        if (err || !modules) {
            send.notfound(link);
            return;
        }

        if (!(modules instanceof Array)) {
            modules = [modules];
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


exports.getFile = function(link){

    if (link.params && link.params.dir) {
        link.req.url = link.params.dir + link.path.slice(2).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        files.serve(link.req, link.res);
    }
    else {
        send.forbidden(link);
    }
};

