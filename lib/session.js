// TODO make sessions expire
var env = process.env;
var cookie = require('cookie');

var sessionCache = engine.cache.pojo('sessions');
var publicSid = engine.uid();
var sessionCookieKey = 'sid';

var roleKey = env.Z_SESSION_ROLE_KEY;
var userKey = env.Z_SESSION_USER_KEY;
var localeKey = env.Z_SESSION_LOCALE_KEY;

/**
 * Create or get a session form a request/connection.
 *
 * @public
 * @param {object} The request or connection object.
 * @param {object} The http response object.
 */
module.exports = function (connection, response) {

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

    // create a default session, if no session exists
    session = session || engine.clone(Session);

    // call the websocket connection hanlder
    if (connection.upgradeReq) {
        return engine.socket.connection(null, session, connection);
    }

    // call the http request handler
    engine.http.request(null, session, connection, response);
};

/**
 * Session object.
 *
 * @class Session
 */
var Session = {

    /**
     * Clone object. True prototypal inheritance.
     *
     * @public
     * @param {string} The role name.
     * @param {string} The locale.
     * @param {string} The user ID.
     * @param {function} The callback handler.
     */
    create: function (role, locale, user, callback) {
        var self = this;

        self.sid = engine.uid();
        self[roleKey] = role;
        self[userKey] = user;
        self[localeKey] = locale || 'en_US';

        // save session
        self.save(callback);
    },

    /**
     * Destroy the session.
     *
     * @public
     * @param {function} The callback handler.
     */
    destroy: function (callback) {
        var self = this;

        // remove from cache
        sessionCache.rm(self.sid);

        // remove session data
        delete self.sid;
        delete self[roleKey];
        delete self[userKey];
        delete self[localeKey];

        callback();
    },

    /**
     * Update/save the session data to the cache.
     *
     * @public
     * @param {function} The callback handler.
     */
    save: function (callback) {
        var self = this;

        // save session
        if (self.sid) {
            sessionCache.set(self.sid, self);
        }

        callback();
    },

    /**
     * Renew the session ID.
     *
     * @public
     * @todo Renew session with a new sid.
     */
    regenerate: function () {},

    /**
     * Update the expire date to now.
     *
     * @public
     */
    touch: function () {
        // update expire
    }
};
