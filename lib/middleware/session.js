// TODO make sessions expire
var env = process.env;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var clone = require(env.Z_PATH_UTILS + 'clone');
var cache = require(env.Z_PATH_CACHE + 'cache');

var sessionCache = cache.pojo('sessions');
var randomStringBase = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var publicSid = uid();
var sessionCookieKey = 'sid';
var roleKey = env.Z_SESSION_ROLE_KEY;
var userKey = env.Z_SESSION_USER_KEY;
var localeKey = env.Z_SESSION_LOCALE_KEY;

module.exports = middleware;

// session class
var Session = {};

// create a new session
Session.create = function (role, locale, user, callback) {

    var session = clone(Session);
    session.sid = uid();
    session[roleKey] = role;
    session[userKey] = user;
    session[localeKey] = locale || 'en_US';
    session.store = sessionCache;

    // save session
    session.save(callback);
};

Session.regenerate = function () {
    // renew session with a new sid
};

Session.destroy = function (callback) {
    var self = this;

    // remove from store
    self.store.rm(self.sid);

    // remove sid
    delete self.sid;

    // set public role
    self[roleKey] = '';

    callback(err);
};
Session.reload = function () {
    // reload session data
};

// save session in store
Session.save = function (callback) {
    var self = this;
    var session = {sid: self.sid};
    session[localeKey] = self[localeKey];
    session[roleKey] = self[roleKey];
    session[userKey] = self[userKey];

    // save session
    self.store.set(self.sid, session);

    callback(null, self);
};
Session.touch = function () {
    // update expire
};
Session.maxAge = function () {
    // expire info
};

// get or create session
function middleware (callback) {

    return function (connection, response) {

        // make it compatible with ws connections
        var con = connection.upgradeReq ? connection.upgradeReq : connection;

        // parse cookies, get session id
        if (con.headers.cookie) {

            var parsedCookie = cookie.parse(con.headers.cookie);

            if (parsedCookie && parsedCookie[sessionCookieKey]) {

                var sessionId = parsedCookie[sessionCookieKey];

                // TODO update expire
                var item = sessionCache.get(sessionId/*, now: new Date().getTime() / 1000*/);

                // set public session if no session is found.. or error?
                if (!item) {
                    connection.session = {
                        create: Session.create
                    };

                // create session for current connection
                } else {

                    var session = clone(Session);
                    session.sid = sessionId;
                    session[roleKey] = item[roleKey];
                    session[localeKey] = item[localeKey];
                    session[userKey] = item[userKey].toString();
                    session.store = sessionCache;

                    // append session to connection
                    connection.session = session;
                }

            // set public session to connection
            } else {
                connection.session = {
                    create: Session.create
                };
            }

        // set public session to connection
        } else {
            connection.session = {
                create: Session.create
            };
        }

        callback(null, connection, response);
    };
}

// random string generator
function uid (len, string) {
    len = len || 23;
    string = string || '';

    for (var i = 0; i < len; ++i) {
        string += randomStringBase[0 | Math.random() * 62];
    }
    return string;
}
