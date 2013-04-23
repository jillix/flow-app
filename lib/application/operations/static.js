var Static = require("node-static");

// at this moment the M.config.app contains only the application id
var files = new Static.Server(M.config.root + "/apps/" + M.config.app, {cache: 604800});

exports.getFile = function (link) {
    
    if (M.config.compressFiles && M.config.compressFileTypes[link.pathname.split('.').pop()]) {
        
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
    }
    
    // reqrite url
    link.req.url = (M.config.app.publicDir ? M.config.app.publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    files.serve(link.req, link.res);
};

exports.getLog = function (link) {
    files.serveFile("log.txt", 200, {}, link.req, link.res);
};

// TODO get default module html && css
exports.getModuleFile = function (link) {
    link.send(501, 'Not "yet" implemented.');
}
