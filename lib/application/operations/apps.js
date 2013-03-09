var StaticServer = require("node-static").Server;
var appStaticServer = null;

exports.getLog = function(link) {

    var appId = link.session.appid;

    if (!appId) {
        return link.send(400, "No appid defined");
    }

    if (!appStaticServer) {
        appStaticServer = new StaticServer(M.config.root + "/apps/" + appId);
    }

    appStaticServer.serveFile("log.txt", 200, {}, link.req, link.res);
};

