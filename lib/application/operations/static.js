var Static = require("node-static");
var files = new Static.Server(M.config.root + "/apps/" + M.config.app.id);

exports.getFile = function(link) {
    
    // reqrite url
    link.req.url = (M.config.app.publicDir ? M.config.app.publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    files.serve(link.req, link.res);
};

exports.getLog = function(link) {
    appStaticServer.serveFile("log.txt", 200, {}, link.req, link.res);
};

// TODO get default module html && css
exports.getModuleFile = function (link) {
    link.send(501, 'Not "yet" implemented.');
}
