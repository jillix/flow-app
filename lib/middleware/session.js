// TODO build an session store api
var env = process.env;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var Model = require(env.Z_PATH_MODELS + 'factory');

var randomStringBase = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var publicSid = uid();
var sessionCookieKey = 'sid';
var roleKey = env.Z_SESSION_ROLE_KEY;
var localeKey = env.Z_SESSION_LOCALE_KEY;
var sessionModel;

module.exports = setup;

// setup session middleware
function setup (callback) {
debugger;
    Model.factory(env.Z_SESSION_MODEL, "admin", function (err, model) {
debugger;
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
                return sessionModel.request({m: 'findOne', q: {sid: sessionId/*TODO expire, exp: {$lt: now}*/}}, function (err, item) {

                    if (err) {
                        return callback(err);
                    }

                    // set public session if no session is found.. or error?
                    if (!item) {
                        connection.session = {};

                    // create session for current connection
                    } else {

                        var session = Session.clone();
                        session.sid = sessionId;
                        session[roleKey] = item[roleKey];
                        session[localeKey] = item[localeKey];
                        session.store = sessionModel;

                        // append session to connection
                        connection.session = session;
                    }

                    callback(null, connection, response);
                    connection.resume();
                });
            } else {

                // set public session to connection
                connection.session = {};
            }
        } else {

            // set public session to connection
            connection.session = {};
        }

        callback(null, connection, response);
    };
}

// create a new session
factory.create = function (role, locale, callback) {

    var session = Session.clone();
    session.sid = uid();
    session[roleKey] = role;
    session[localeKey] = locale || 'en_US';
    session.store = sessionModel;

    // save session
    session.save(callback);
};

// session class
var Session = {};
Session.regenerate = function () {
    // renew session with a new sid
};

Session.destroy = function (callback) {
    var self = this;

    // remove from store
    self.store.request({m: 'remove', q: {sid: self.sid}}, function (err) {
        callback(err, self);
    });

    // remove sid
    delete self.sid;
    // set public role
    self[roleKey] = {};
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

    // save session
    self.store.request({m: 'update', q: {sid: self.sid}, d: {$set: doc}, o: {upsert: true}}, function (err) {
        callback(err, self);
    });
};
Session.touch = function () {
    // update expire
};
Session.maxAge = function () {
    // expire info
};

// random string generator
function uid (len, string) {
    len = len || 23;
    string = string || '';

    for (var i = 0; i < len; ++i) {
        string += randomStringBase[0 | Math.random() * 62];
    }
    return string;
}
