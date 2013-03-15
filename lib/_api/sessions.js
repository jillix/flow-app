var pongo = new require('pongo')({
    host: M.config.mongoDB.host,
    port: M.config.mongoDB.port,
    server: {poolSize: 3},
    db: {w: 1}
});

function updateSession ( sessionID, doc, callback ){
	
	pongo.connect(M.config.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.update({ sid: sessionID }, doc, callback );
	});
};

function endAllUserSessions ( userID, callback ){
	
	pongo.connect(M.config.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ uid: userID }, callback );
	});
};

function endSessions ( now, callback ){
	
	pongo.connect(M.config.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ exp: { $lt: now } }, callback );
	});
};

function endSession ( sessionID, callback ){
	
	pongo.connect(M.config.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err, null );
		else db.remove({ sid: sessionID }, callback );
	});
};

function getSession (sessionId, now, expire, callback) {

    pongo.connect(M.config.mongoDB.name, "sessions", function(err, db) {

        if (err) { return callback(err); }

        db.findAndModify(
            { sid: sessionId, exp: { $gt: now } },
            [],
            { $set: { exp: expire } },
            { fields: { _id: 0, uid: 1, appid: 1, data: 1, loc: 1 } },
            callback
        );
    });
};

function startSession (session, callback) {

	pongo.connect(M.config.mongoDB.name, "sessions", function(err, db) {

        if (err) { return callback(err) };

        db.insert(session, { safe: true },  callback);
	});
};

exports.updateSession = updateSession;
exports.endAllUserSessions = endAllUserSessions;
exports.endSessions = endSessions;
exports.endSession = endSession;
exports.getSession = getSession;
exports.startSession = startSession;
