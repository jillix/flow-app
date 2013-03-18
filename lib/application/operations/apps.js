var StaticServer = require("node-static").Server;
var appStaticServer = new StaticServer(M.config.root + "/apps/" + M.config.app.id);

exports.getLog = function(link) {
    appStaticServer.serveFile("log.txt", 200, {}, link.req, link.res);
};
