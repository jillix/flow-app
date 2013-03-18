var files = new (require("node-static").Server)(M.config.root + "/apps");

exports.getFile = function(link) {
    
    // change the request URL to the internal one
    link.req.url = M.config.app.id + "/" + (M.config.app.publicDir ? M.config.app.publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    files.serve(link.req, link.res);
};
