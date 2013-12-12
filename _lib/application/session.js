var cookie = require('cookie');
var colName = 'sessions';
var expire_time = 168; // one week 7*24
var M = process.mono;

var publicSession = {
    
    set: function (data, callback) {
        
        if (data.constructor.name !== 'Object') {
            return callback(new Error('Data must be an object.'));
        }
        
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        }
        callback();
    },
    end: function (all, callback) {
        if (typeof all === 'function') {
            callback = all;
        }
        callback();
    },
    renew: function (callback) {
        callback();
    }
};

// session class
var Session = {
    
    set: function(data, callback) {

        callback = callback || function() {};

        if (data.constructor.name !== 'Object') {
            return callback(new Error('Data must be an object.'));
        }
        
        var self = this;

        M.db.app.collection(colName).update({_sid: self._sid}, {$set: data}, function (err) {
            
            if (err) {
                return callback(err);
            }
            
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    self[key] = data[key];
                }
            }

            callback(null);
        });
    },
    
    end: function (endAll, callback) {

        var self = this;

        if (typeof endAll === 'function') {
            callback = endAll;
            endAll = null;
        }
        
        M.db.app.collection(colName).remove(
            endAll ? { _uid: self._uid, _rid: self._rid } : { _sid: self._sid },
            callback
        );
    },
    
    renew: function (callback) {
        
        var self = this;
            
        var newSid = M.util.uid(23);
        
        M.db.app.collection(colName).update({_sid: self._sid}, {$set: {_sid: newSid}}, function (err) {
            
            if (err) {
                return callback(err);
            }
            
            self._sid = newSid;
            
            callback();
        });
    }
};

//------------------------------------------------------------------------------------------

function getSession (sessionId, now, expire, callback) {
    var self = this;
    
    M.db.app.collection(colName).findAndModify(
        {_sid: sessionId, _exp: {$gt: now}},
        [],
        {$set: {_exp: expire}},
        {fields: {_id: 0}},
        callback
    );
}

function startSession (session, callback) {
    var self = this;
    M.db.app.collection(colName).insert(session, { w: 1 },  callback);
}

function expire(hoursPlus) {
	return Math.round(new Date().getTime() / 3600000) + (hoursPlus || 0); //86400000 = 1day, 3600000 = 1hour
}

function sessionConstructor (session) {
    
    var clonedSession = Session.clone();

    for (var key in session) {
        if (session.hasOwnProperty(key)) {
            clonedSession[key] = session[key];
        }
    }
    
    return clonedSession;
}

function getPublicSession () {
    
    var session = publicSession.clone();
    session._rid = M.config.session.publicRole;
    session._loc = M.config.locale || "*";
    
    return session;
}

//------------------------------------------------------------------------------------------

function get (headers, callback) {
    var self = this;
    
    var cooky = {};
    
    if (headers.cookie) {
    
        // parse cookie
        cooky = cookie.parse(headers.cookie);

        // get session and overwrite default session
        if (cooky[M.config.session.id]) {

            return getSession.call(self, cooky[M.config.session.id], expire(), expire(expire_time), function(err, session) {

                if (!err && session) {
                    session = sessionConstructor(session);
                } else {
                    // TODO maybe redirect user to a login page if session is not valid anymore
                    session = getPublicSession();
                }
                
                headers['set-cookie'] = M.config.session.locale + '=' + session._loc + '; path=/';
                callback(session);
            });
        }
    }
    
    var session = getPublicSession();
    
    headers['set-cookie'] = M.config.session.locale + '=' + session._loc + '; path=/';
    callback(session, headers);
}

function end (link, callback) {
    var self = this;
    
    // do not destroy public session (that don't have a session id
    if (!link.session._sid) {
        return callback(null);
    }

    // expire the client cookie
    link.res.headers['set-cookie'] = M.config.session.id + '=' + link.session._sid + '; path=/; expires=' + new Date().toGMTString();

    // remove from the database
    link.session.end(callback);
}

function renew (link, rid, uid, locale, data, callback) {
    var self = this;
    
    M.session.end(link, function(err) {

        if (err) { return callback(err); }

        M.session.start(link, rid, uid, locale, data, callback);
    });
}

// start new Session
// TODO set expire date in cookie header
// and make expire time configurable
function start (link, rid, uid, locale, data, callback) {
    var self = this;
    
    if (typeof data === "function") {
        callback = data;
    }

    if (typeof rid !== 'number' || (!uid && uid !== 0) || !locale) {
        return callback(new Error('Invalid arguments.'));
    }

    var session = data.constructor.name === 'Object' ? data : {};
    session._rid = rid;
    session._uid = uid;
    session._loc = locale;
    session._sid = M.util.uid(23);
    session._exp = expire(expire_time);

    startSession(session, function (err) {

		if (err) {
            return callback(err);
        }

        var clonedSession = Session.clone();
        clonedSession.api = self;
        
        for (var key in session) {
            if (session.hasOwnProperty(key)) {
                clonedSession[key] = session[key];
            }
        }

        link.res.headers['set-cookie'] = [
            M.config.session.id + '=' + session._sid + '; path=/',
            M.config.session.locale + '=' + locale + '; path=/'
        ];

        link.session = sessionConstructor(session);
		callback(null, link.session);
	});
}

exports.get = get;
exports.start = start;
exports.end = end;
exports.renew = renew;
exports.public = publicSession;
