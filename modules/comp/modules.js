var send = require(CONFIG.root + "/core/send.js" ).send,
    getModule = require(CONFIG.root + "/core/model/orient.js").getModule,
    StaticServer = require("node-static" ).Server,
    modules = new StaticServer(CONFIG.root + "/modules");


// browser modules
exports.getModule = function(link) {

    if (!link.path || typeof link.path[2] == "undefined") {
        send.badrequest(link.res);
        return;
    }

    var module = link.path[2].replace(/[^0-9a-z_\-]/gi, "");

    if (module === "") {
        send.badrequest(link.res);
        return;
    }
    
    getModule(module, link.session.uid, function(err, res) {
        
        if (err || !res || !res.module) {
            send.notfound(link.res);
            return;
        }
            
        link.req.url = res.module + (res.dir || "") + "/" + link.path.slice(3).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        modules.serve(link.req, link.res);
    });
};

