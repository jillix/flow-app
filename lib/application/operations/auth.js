var session = require(M.config.root + "/lib/application/session.js");
var crypto = require("crypto");
var Cookies = require("cookies");

exports.login = function(link) {

    // invalid request of data is missing
    if (!link.data || !link.data.user || !link.data.pass) {
        return link.send(400, "Missing login data");
    }

    var user = link.data.user,
        pass = link.data.pass,
        appId = link.session.appid;

    M.model.getUser(appId, user, function(err, user) {

        if (err) {
            return link.send(500, err);
        }

        if (!user) {
            return link.send(403, "Invalid user or password");
        }

        var hash = crypto.createHash("sha256").update(pass).digest("hex");

        if (hash !== user.password) {
            return link.send(403, "Invalid user or password");
        }

        var language = user.data.language || "fr";
        var extraData = user.data.session || {};

        session.start(user.uid, appId, language, extraData, function(err, session) {

            if (err) {
                return link.send(500, err);
            }

            cookies = new Cookies(link.req, link.res);
            cookies.set("sid", session.sid, { path: "/" });
            link.send(200, session.sid);
        });
    });
};


exports.logout = function(link) {

    if (link.session && typeof link.session.end === "function") {

        link.session.end(function() {
            cookies = new Cookies(link.req, link.res);
            cookies.set("sid");
            link.send(200, session.sid);
        });

        return;
    }
    
    return link.send(400, "Tried to logout session " + session.sid + " but session.end was not a function.");
};
