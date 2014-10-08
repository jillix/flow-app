// TODO build an session store api
var env = process.env;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var clone = require(env.Z_PATH_UTILS + 'clone');
var Model = require(env.Z_PATH_MODELS + 'factory');

var randomStringBase = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var publicSid = uid();
var sessionCookieKey = 'sid';
var roleKey = env.Z_SESSION_ROLE_KEY;
var userKey = env.Z_SESSION_USER_KEY;
var localeKey = env.Z_SESSION_LOCALE_KEY;
var sessionModel;

module.exports = setup;

// session class
var Session = {};

// create a new session
Session.create = function (role, locale, user, callback) {

    var session = clone(Session);
    session.sid = uid();
    session[roleKey] = role;
    session[userKey] = user;
    session[localeKey] = locale || 'en_US';
    session.store = sessionModel;

    // save session
    session.save(callback);
};

Session.regenerate = function () {
    // renew session with a new sid
};

Session.destroy = function (callback) {
    var self = this;

    // remove from store
    self.store.queries.remove({sid: self.sid}, function (err) {
        callback(err);
    });

    // remove sid
    delete self.sid;
    // set public role
    self[roleKey] = '';
};
Session.reload = function () {
    // reload session data
};

// save session in store
Session.save = function (callback) {
    var self = this;
    var doc = {sid: self.sid};
    doc[localeKey] = self[localeKey];
    doc[roleKey] = self[roleKey];
    doc[userKey] = self[userKey];

    // save session
    self.store.queries.renew({sid: self.sid, doc: doc}, function (err) {
        callback(err, self);
    });
};
Session.touch = function () {
    // update expire
};
Session.maxAge = function () {
    // expire info
};

// setup session middleware
function setup (callback) {

    Model.factory(env.Z_SESSION_MODEL, env.Z_SESSION_ROLE, function (err, model) {

        if (err) {
            return callback(err);
        }

        // save session model (mongodb-native collection)
        sessionModel = model;

        // return handler
        callback(null, factory);

    });
}

// get or create session
function factory (callback) {

    return function (connection, response) {

        // make it compatible with ws connections
        var con = connection.upgradeReq ? connection.upgradeReq : connection;

        // parse cookies, get session id
        if (con.headers.cookie) {
            var parsedCookie = cookie.parse(con.headers.cookie);

            if (parsedCookie && parsedCookie[sessionCookieKey]) {

                // pause connection
                connection.pause();

                var sessionId = parsedCookie[sessionCookieKey];

                // TODO update expire
                return sessionModel.queries.get({sid: sessionId/*, now: new Date().getTime() / 1000*/}, function (err, item) {

                    if (err) {
                        return callback(err);
                    }

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
                        session.store = sessionModel;

                        // append session to connection
                        connection.session = session;
                    }

                    callback(null, connection, response);
                    connection.resume();
                });
            } else {

                // set public session to connection
                connection.session = {
                    create: Session.create
                };
            }
        } else {

            // set public session to connection
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
