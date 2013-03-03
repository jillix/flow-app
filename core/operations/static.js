var send = require(CONFIG.root + "/core/send.js").send;
var model = require(CONFIG.root + "/core/model");

var files = new (require("node-static").Server)(CONFIG.root + "/apps");

exports.getFile = function(link) {

    var appId = link.session.appid;
    if (!appId) {
        return send.internalservererror(link, err);
    }

    model.getApplication(appId, function(err, result) {

        if (err || !result) {
            send.notfound(link, "File not found: " + link.req.url);
            return;
        }

        exports.serve(link, appId, result.publicDir);
    });
};

exports.serve = function(link, appId, publicDir) {

    var externalUrl = link.req.url;

    // change the request URL to the internal one
    link.req.url = appId + "/" + (publicDir ? publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

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

