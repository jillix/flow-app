var cookie = require('cookie');
var colName = 'sessions';
var expire_time = 168; // one week 7*24

var publicSession = !M.config.app ? {} : {
    _loc: M.config.app.locale || "*",
    _rid: M.config.app.publicRole,
    set: function (data, callback) {
        
        if (data.constructor.name !== 'Object') {
            return callback(new Error('Data must be an object.'))
        }
        
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                self[key] = data[key];
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
        
        if (typeof endAll === 'function') {
            callback = endAll;
            endAll = null;
        }
        
        M.mongo.connect(M.config.mongoDB.name, function (err, db) {
            
            if (err) {
                return callback(err);
            }
            
            db.collection(colName).remove(
                endAll ? {_uid: this._uid} : {_sid: this._sid},
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

//------------------------------------------------------------------------------------------

function get (link, callback) {
    
    // parse cookie
    var sid = cookie.parse(link.req.headers.cookie).sid;
    
    // get session and overwrite default session
    if (sid) {
        
        return getSession(sid, expire(), expire(expire_time), function(err, session) {
            
            if (!err && session) {
                link.session = sessionConstructor(session);
            }
            
            callback(link);
        });
    }
    
    // or just do nothing
    callback(link);
};

// start new Session
// TODO set expire date in cookie header
// and make expire time configurable
function start (link, rid, uid, locale, data, callback) {
    
    if (typeof data === "function") {
        callback = data;
    }
    
    if (typeof rid !== 'number' || typeof uid !== 'number' || !locale) {
        return callback(new Error('Invalid arguments.'));
    }
    
    var session = data.constructor.name === 'Object' ? data : {};
    session._rid = rid,
    session._uid = uid,
    session._loc = locale,
    session._sid = M.util.uid(23),
    session._exp = expire(expire_time)
    
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
        
        link.res.headers['set-cookie'] = 'sid=' + session._sid;
        
		callback(null, sessionConstructor(session));
	});
};

exports.get = get;
exports.start = start;
exports.public = publicSession;
