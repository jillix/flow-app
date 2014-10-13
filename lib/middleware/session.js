// TODO make sessions expire
var env = process.env;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var clone = require(env.Z_PATH_UTILS + 'object').clone;
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
    var self = this;

    self.sid = uid();
    self[roleKey] = role;
    self[userKey] = user;
    self[localeKey] = locale || 'en_US';

    // save session
    self.save(callback);
};

Session.regenerate = function () {
    // renew session with a new sid
};

Session.destroy = function (callback) {
    var self = this;

    // remove from cache
    sessionCache.rm(self.sid);

    // remove session data
    delete self.sid;
    delete self[roleKey];
    delete self[userKey];
    delete self[localeKey];

    callback();
};

Session.reload = function () {
    // reload session data
};

// save session in cache
Session.save = function (callback) {
    var self = this;

    // save session
    if (self.sid) {
        sessionCache.set(self.sid, self);
    }

    callback();
};

Session.touch = function () {
    // update expire
};

Session.maxAge = function () {
    // expire info
};

// get or create session
function middleware (connectionHandler) {

    return function (connection, response) {

        // make it compatible with ws connections
        var con = connection.upgradeReq ? connection.upgradeReq : connection;

        // create an empty session
        var session;

        // parse cookies, get session id
        if (con.headers.cookie) {

            var parsedCookie = cookie.parse(con.headers.cookie);

            if (parsedCookie && parsedCookie[sessionCookieKey]) {

                // get session
                // TODO update expire
                session = sessionCache.get(parsedCookie[sessionCookieKey]/*, now: new Date().getTime() / 1000*/);

                // remove cookie from http headers
                if (!session) {
                    connection._sidInvalid = true;
                }
            }
        }

        // append session to connection
        connection.session = session || clone(Session);

        // continue with request
        connectionHandler(null, connection, response);
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
