// TODO build an session store api

var M = process.mono;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var publicSession = M.config.session;
var randomStringBase = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var publicSid = uid();
var sessionCookieKey = 'sid';
var sessionCollection = 'm_sessions';
var roleKey = publicSession.role;
var localeKey = publicSession.locale;
var systemDb = M.store[M.config.database];

module.exports = factory;

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
                var sessionCol = systemDb.collection(sessionCollection);
                
                // TODO update expire
                return sessionCol.findOne({sid: sessionId/*TODO expire, exp: {$lt: now}*/}, function (err, item) {
                    
                    if (err) {
                        return callback(err);
                    }
                    
                    // set public session if no session is found.. or error?
                    if (!item) {
                        connection.session = {};
                        connection.session[roleKey] = publicSession.publicRole;
                        
                    // create session for current connection
                    } else {
                    
                        var session = Session.clone();
                        session.sid = sessionId;
                        session[roleKey] = item[roleKey];
                        session[localeKey] = item[localeKey];
                        session.store = sessionCol;
                        
                        // append session to connection
                        connection.session = session;
                    }
                    
                    callback(null, connection, response);
                    connection.resume();
                });
            } else {
                
                // set public session to connection
                connection.session = {};
                connection.session[roleKey] = publicSession.publicRole;
            }
        } else {
            
            // set public session to connection
            connection.session = {};
            connection.session[roleKey] = publicSession.publicRole;
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
    session.store = systemDb.collection(sessionCollection);
    
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
    self.store.remove({sid: self.sid}, function (err) {
        callback(err, self);
    });
    
    // remove sid
    delete self.sid;
    // set public role
    self[roleKey] = publicSession.publicRole;
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
    self.store.update({sid: self.sid}, {$set: doc}, {upsert: true}, function (err) {
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
