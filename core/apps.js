var send = require(CONFIG.root + "/core/send.js").send,
    StaticServer = require("node-static").Server;

var appStaticServer = null;

exports.getLog = function(link) {

    var appId = link.session.appid;

    if (!appId) {
        send.badrequest(link, "No appid defined");
        return;
    }

    if (!appStaticServer) {
        appStaticServer = new StaticServer(CONFIG.root + "/apps/" + appId);
    }

    appStaticServer.serveFile("log.txt", 200, {}, link.req, link.res);
};

