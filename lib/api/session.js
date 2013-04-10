var cookie = require('cookie');
var colName = 'sessions';
var expire_time = 168; // one week 7*24

var publicSession = {
    
    set: function (data, callback) {
        
        if (data.constructor.name !== 'Object') {
            return callback(new Error('Data must be an object.'))
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
        
        if (data.constructor.name !== 'Object') {
            return callback(new Error('Data must be an object.'))
        }
        
        var self = this;

        M.mongo.connect(M.config.mongoDB.name, function (err, db) {
            
            if (err) {
                return callback(err);
            }
            
            db.collection(colName).update({_sid: self._sid}, {$set: data}, function (err) {
                
                if (err) {
                    return callback(err);
                }
                
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        self[key] = data[key];
                    }
                }
                
                callback();
            });
        });
    },
    
    end: function (endAll, callback) {

        var self = this;

        if (typeof endAll === 'function') {
            callback = endAll;
            endAll = null;
        }
        
        M.mongo.connect(M.config.mongoDB.name, function (err, db) {
            
            if (err) {
                return callback(err);
            }

            db.collection(colName).remove(
                endAll ? { _uid: self._uid, _rid: self._rid } : { _sid: self._sid },
                callback
            );
        });
    },
    
    renew: function (callback) {
        
        var self = this;
        
        M.mongo.connect(M.config.mongoDB.name, function (err, db) {
            
            if (err) {
                return callback(err);
            }
            
            var newSid = M.util.uid(23);
            
            db.collection(colName).update({_sid: self._sid}, {$set: {_sid: newSid}}, function (err) {
                
                if (err) {
                    return callback(err);
                }
                
                self._sid = newSid;
                
                callback();
            });
        });
    }
};

//------------------------------------------------------------------------------------------

function getSession (sessionId, now, expire, callback) {

    M.mongo.connect(M.config.mongoDB.name, function(err, db) {

        if (err) {
            return callback(err);
        }
        
        db.collection(colName).findAndModify(
            {_sid: sessionId, _exp: {$gt: now}},
            [],
            {$set: {_exp: expire}},
            {fields: {_id: 0}},
            callback
        );
    });
};

function startSession (session, callback) {

	M.mongo.connect(M.config.mongoDB.name, function(err, db) {

        if (err) {
            return callback(err)
        };
        
        db.collection(colName).insert(session, {safe: true},  callback);
	});
};

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

function getPublicSession (link, localeFromCookie) {
    
    link.session = publicSession.clone();
    link.session._rid = M.config.app.publicRole;
    
    if (localeFromCookie) {
        link.session._loc = localeFromCookie;
    } else {
        link.session._loc = M.config.app.locale || "*";
        link.res.headers['set-cookie'] = M.config.session.locale + '=' + link.session._loc + '; path=/';
    }
}

//------------------------------------------------------------------------------------------

// TODO check in query params for an sid
// TODO check if locale is in url query params
function get (link, callback) {
    
    var cooky = {};
    
    if (link.req.headers.cookie) {
    
        // parse cookie
        cooky = cookie.parse(link.req.headers.cookie);

        // get session and overwrite default session
        if (cooky[M.config.session.id]) {

            return getSession(cooky[M.config.session.id], expire(), expire(expire_time), function(err, session) {

                if (!err && session) {
                    link.session = sessionConstructor(session);
                } else {
                    // TODO maybe redirect user to a login page if session is not valid anymore
                    getPublicSession(link, cooky[M.config.session.locale]);
                }
                
                callback(link);
            });
        }
    }
    
    getPublicSession(link, cooky[M.config.session.locale]);
    
    callback(link);
};

// start new Session
// TODO set expire date in cookie header
// and make expire time configurable
function start (link, rid, uid, locale, data, callback) {
    
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

        for (var key in session) {
            if (session.hasOwnProperty(key)) {
                clonedSession[key] = session[key];
            }
        }

        link.res.headers['set-cookie'] = [
            M.config.session.id + '=' + session._sid + '; path=/',
            M.config.session.locale + '=' + locale + '; path=/'
        ];

		callback(null, sessionConstructor(session));
	});
};

exports.get = get;
exports.start = start;
exports.public = publicSession;
