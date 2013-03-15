var files = new (require("node-static").Server)(M.config.root + "/apps");

exports.getFile = function(link) {

    var appId = link.session.appid;
    if (!appId) {
        return link.send(500, err);
    }
    
    M.app.getFromId(appId, {publicUser: 1}, function (err, result) {

        if (err || !result) {
            return link.send(404, "File not found: " + link.req.url);
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
                return link.send(404, "File not found: " + externalUrl);
            default:
                link.send(500, err);
        }
    });
}

