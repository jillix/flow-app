var utils = require('./client/utils');
var Cache = require('./cache');
var Request = require('./request');
var Socket = require('./client/socket');

// TODO make sessions expire
var cookie = require('cookie');

var sessionCache = Cache('sessions');
var publicSid = utils.uid();
var sessionCookieKey = 'sid';

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
            session = sessionCache.get(parsedCookie[sessionCookieKey]);

            // remove cookie from http headers
            if (!session) {
                connection._sidInvalid = true;
            }
        }
    }

    // create a default session, if no session exists
    session = session || utils.clone(Session);

    // update the expire date time
    session.touch();
    
    // append session to connection
    connection.session = session;

    // call the websocket connection hanlder
    if (connection.upgradeReq) {
        return Socket.setup(connection);
    }

    // call the http request handler
    Request(connection, response);
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

        self.sid = utils.uid();
        self[engine.session_role] = role;
        self[engine.session_user] = user;
        self[engine.session_locale] = locale || 'en_US';

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
        delete self[engine.session_role];
        delete self[engine.session_user];
        delete self[engine.session_locale];

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
    regenerate: function () {
        // TODO renew session id
    },

    /**
     * Update the expire date to now.
     *
     * @public
     * @todo Update the expire date on the session
     */
    touch: function () {
        // TODO update expire
    }
};
