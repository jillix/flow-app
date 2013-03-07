var util = require(CONFIG.root + "/lib/util" );
var model = require(CONFIG.root + "/lib/model");

var expire_time = 9;

// session class
var Session = {

    set: function( callback ){
        update( this.sid, this.data, false, callback );
    },

    end: function( callback ){
        model.endSession( this.sid, callback );
    },

    endAll: function( ){
        model.endAllUserSessions( this.uid, callback );
    },

    newid: function( callback ){

        var self = this;

        update( self.sid, self.data, true, function( newSid ){
            self.sid = newSid;
            callback();
        });
    }
};

//// remove old sessions
//// TODO: run this in a separate process ( cron )
//setInterval(function(){
//
//    //var now = Math.round( new Date().getTime() / 86400000 );
//
//    model.endSessions( expire(), function( err ){
//        if( err ) throw new Error( err );
//    });
//		
//}, 1800000); // 30 min


//------------------------------------------------------------------------------------------
exports.get = function(link, callback) {

    if (link.req.session) { return callback(null, link.req.session); }

    var sid = null;

    if (link.req.headers["cookie"]) {
        sid = link.req.headers["cookie"].split("=")[1];
    }

    var publicSession = function(domain, callback) {
        model.getDomainPublicUser(domain, callback);
    };

    // try to find session
    if (sid) {
        model.getSession(sid, expire(), expire(expire_time), function(err, session) {

            // if some kind of error, no session or expired session, generate a default one
            if (err || !session) {
                publicSession(link.host, callback);
                return;
            }

            callback(null, newSession(session));
        });
    }

    // if no session-id is defined create public session
    else {
        publicSession(link.host, callback);
    }
};

// start new Session
exports.start = function(uid, appid, locale, data, callback) {

    var session = {
        'sid': util.uid(23), // generate session id
        'exp': expire(expire_time),
        'uid': uid,
        'appid': appid,
        'loc': locale
    };

    if (typeof data == "function") {
        callback = data;
    }
    else if (data) {
        session.data = data;
    }

    model.startSession(session, function(err) {

		if (err) { return callback(err); }

		callback(null, newSession(session));
	});
};

//------------------------------------------------------------------------------------------

// new session object
function newSession(ses){

    var cloned_session = Session.clone();

    if (ses.sid) cloned_session.sid = ses.sid;
    if (ses.uid) cloned_session.uid = ses.uid;
    if (ses.appid) cloned_session.appid = ses.appid;
    if (ses.loc) cloned_session.loc = ses.loc;
    if (ses.data) cloned_session.data = ses.data;

    return cloned_session;
}

//get the expire-time
function expire( plus ){
	
	return Math.round( new Date().getTime() / 3600000 ) + ( plus || 0 ); //86400000 = 1day, 3600000 = 1hour
}

//update session
function update( sid, data, newId, callback ){
	
	var q_update = { '$set': { 'data': data, 'exp': expire( expire_time ) } };
			
	//generate new sid
	if( newId ) q_update.$set.sid = util.uid();
	
	model.updateSession( sid, q_update, function( err ){
		
		if( err || ( newId && !q_update.$set.sid ) ) callback( err || new Error( "generate sid" ), null );
		else if( newId ) callback( null, q_update.$set.sid );
		else callback( null );
	});
}

