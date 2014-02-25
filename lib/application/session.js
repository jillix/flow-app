var M = process.mono;
var EventEmitter = require('events').EventEmitter;
var cookie = require('cookie');
var publicSession = M.config.session;
var randomStringBase = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var publicSid = uid();
var sessionCookieKey = 's';
var sessionCollection = 'm_sessions';

module.exports = factory;

// get or create session
function factory (callback) {
    return function (connection, response) {
        
        // make it compatible with ws connections
        var con = connection.upgradeReq ? connection.upgradeReq : connection;
        
        // parse cookies, get session id
        if (con.headers.cookie) {
            var parsedCookie = cookie.parse(con.headers.cookie);
            
            console.log(prasedCookie);
            
            if (parsedCookie && parsedCookie[sessionCookieKey]) {
                
                var sessionId = parsedCookie[sessionCookieKey];
                var sessionCol = M.db.app.collection(sessionCollection);
                
                sessionCol.findOne({sid: sessionId/*TODO expire, exp: {$lt: now}*/}, function (err, item) {
                    
                    if (err) {
                        return callback(err);
                    }
                    
                    if (!item) {
                        // set public session if no session is found.. or error?
                        connection.session = {rid: M.config.session.publicRole};
                    }
                    
                    var session = Session.clone();
                    session.id = sessionId;
                });
            }
        } else {
            
            // set public session to connection
            connection.session = {rid: M.config.session.publicRole};
        }
        
        callback(null, connection, response);
    };
}

// session class
var Session = new EventEmitter();
Session.regenerate = function () {
    // renew session with a new sid
};
Session.destroy = function () {
    // remove session from db
};
Session.reload = function () {
    // reload session data
};
Session.save = function () {
    // save session
};
Session.touch = function () {
    // update expire
};
Session.cookie = function () {
    // client side cookie data
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
