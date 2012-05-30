var mongo = require(CONFIG.root + "/db/mongo" ).db


exports.getSession = function(sessionId, now, expire, callback) {

    mongo(CONFIG.mongoDB.name, "sessions", function(err, db) {

        if (err) { return callback(err); }

        db.findAndModify(
            { sid: sessionId, exp: { $gt: now } },
            [],
            { $set: { exp: expire } },
            { fields: { _id: 0, uid: 1, appid: 1, data: 1 } },
            callback
        );
    });
};


exports.startSession = function(session, callback) {

	mongo(CONFIG.mongoDB.name, "sessions", function(err, db) {
        console.log(err);
        if (err) { return callback(err) };

        db.insert(session, { safe: true },  callback);
	});
};

