var send = require(CONFIG.root + "/core/send.js").send,
    session = require(CONFIG.root + "/core/session.js");
    model = require(CONFIG.root + "/core/model/orient.js");
    crypto = require("crypto"),
    Cookies = require("cookies");


exports.login = function(link) {

    // invalid request of data is missing
    if (!link.data || !link.data.user || !link.data.pass) {
        send.badrequest(link, "Missing login data");
        return;
    }

    var user = link.data.user,
        pass = link.data.pass,
        appId = link.session.appid;

    model.getUser(appId, user, function(err, user) {

        if (err) {
            send.internalservererror(link, err);
            return;
        }

        if (!user) {
            send.forbidden(link, "Invalid user or password");
            return;
        }

        var hash = crypto.createHash("sha256").update(pass).digest("hex");

        if (hash !== user.password) {
            send.forbidden(link, "Invalid user or password");
            return;
        }

        var language = user.data.language || "fr";
        var extraData = user.data.session || {};

        session.start(user.uid, appId, language, extraData, function(err, session) {

            if (err) {
                send.internalservererror(link, err);
                return;
            }

            cookies = new Cookies(link.req, link.res);
            cookies.set("sid", session.sid, { path: "/" });
            send.ok(link.res, session.sid);
        });
    });
};


exports.logout = function(link) {

    if (link.session && typeof link.session.end === "function") {

        link.session.end(function() {
            cookies = new Cookies(link.req, link.res);
            cookies.set("sid");
            send.ok(link.res, session.sid);
        });

        return;
    }

    send.badrequest(link, "Tried to logout session " + session.sid + " but session.end was not a function.");
    return;
};
