var self = this,
	uuid = require( CONFIG.root + "/core/util" ).uuid,
	queries = require( CONFIG.root + "/db/queries" ),
	model = require(CONFIG.root + "/core/model/orient.js"),
	expire_time = 9,
	
	//session class
	Session = {
	
		set: function( callback ){
			
			update( this.sid, this.data, false, callback );
		},
		
		end: function( callback ){
			
			queries.endSession( this.sid, callback );
		},
		
		endAll: function( ){
			
			queries.endAllUserSessions( this.uid, callback );
		},
		
		newid: function( callback ){
			
			var self = this;
			
			update( self.sid, self.data, true, function( newSid ){
				
				self.sid = newSid;
				callback();
			});
		}
	};

//remove old sessions
// TODO: run this in a separate process ( cron )
setInterval(function(){
	
	//var now = Math.round( new Date().getTime() / 86400000 );
	
	queries.endSessions( expire(), function( err ){
		
		if( err ) throw new Error( err );
	});
		
}, 1800000); //30 min

//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
this.get = function(link, callback) {
    
    //try to find session
    if (link.req.headers['x-sid']) {
        
        queries.getSession(link.req.headers['x-sid'], expire(), expire(expire_time), function(err, session) {
            
            if (err) {
                
                callback(err);
            }
            else if (session) {
                
                callback(null, session);
            }
            else {
                
                callback(new Error("Session not found."));
            }
        });
    }
    // if no session-id is defined create public session
    else {
        model.getDomainPublicUser(link.host, function(err, userId) {
        
            if (err) {
                return callback(err);
            }

            callback(null, { uid: userId });
        });
    }
};

//start new Session
this.start = function( uid, locale, data, callback ){
	
	var session = {
		
		'sid': uuid( 23 ), // generate session id
		'exp': expire( expire_time ),
		'uid': uid,
		'loc': locale
	};
	
	if( typeof data == "function" ) callback = data;
	else if( data ) session.data = data;
	
	queries.startSession( session, function( err ){
		
		if( err ) callback( err, null );
		else callback( null, newSession( session ) );
	});
};
//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------

//new session object
function newSession( ses ){
	
	var cloned_session = Session.clone();
	
	if( ses.sid ) cloned_session.sid = ses.sid;
	if( ses.uid ) cloned_session.uid = ses.uid;
	if( ses.loc ) cloned_session.loc = ses.loc;
	if( ses.data ) cloned_session.data = ses.data;
	
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
	if( newId ) q_update.$set.sid = uuid();
	
	queries.updateSession( sid, q_update, function( err ){
		
		if( err || ( newId && !q_update.$set.sid ) ) callback( err || new Error( "generate sid" ), null );
		else if( newId ) callback( null, q_update.$set.sid );
		else callback( null );
	});
}
