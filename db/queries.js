var mongo	= require( CONFIG.root + "/db/mongo" ).db,
	orient	= require( CONFIG.root + "/db/orientdb" ).db;

// !----------------------------------------------------------------------------------------

this.assignRoleToOperation = function( roleID, operationID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.addEdge( "5:" + roleID, "5:" + operationID, "CAN_PERFORM", null, callback );
	});
};

this.unassignRoleFromOperation = function( roleID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeEdge( "5:" + roleID, "CAN_PERFORM", callback );
	});
};

this.assignRoleToUIElement = function( comp, view, roleID, UIElementID, data, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else if( comp && view ) {
			
			if( !data ) data = {};
			
			data._comp = comp;
			data._view = view;
			
			db.addEdge( "5:" + roleID, "5:" + UIElementID, "HAS_ACCESS_TO", data, callback );
		}
		else callback( new Error( "Invalid Data provided." ) ); 
	});
};

this.unassignRoleFromUIElement = function( comp, view, roleID, callback ){
	
	// !...
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeEdge( "5:" + roleID, "HAS_ACCESS_TO", callback );
	});
};

this.assignUserToRole = function( userID, roleID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
		
		if( err ) callback( err );
		else db.addEdge( "5:" + userID, "5:" + roleID, "MEMBER_OF", null, callback );
	});
};

this.unassignUserFromRole = function( userID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeEdge( "5:" + userID, "MEMBER_OF", callback );
	});
};

// !----------------------------------------------------------------------------------------

this.getUserByAuthPub = function( authPub, fields, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.sql( "select " + fields + " AS pwd from OGraphVertex where klass = 'User' and auth[pub] = '" + authPub + "' limit 1", callback );
	});
};

this.getUsersOperation = function( operationID, userID, callback ) {
	
	var opid = operationID.replace( /[^0-9]/g, "" );
	
	if( opid ) {
	
		orient( CONFIG.orientDB, function( err, db ){
			
			if( err ) callback( err );
			else db.sql(
				
				"select module,file,method,in[@class = 'ECanPerform'].params as params from #9:" + opid + " where in traverse(5,5) (@rid = #7:" + userID + ")",
				callback
			);
		});
	}
	else callback( new Error( "Invalid Operation ID: " + operationID ) );
};

this.getUsersUIElements = function( userID, callback ) {
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.sql(
			
			"select _out.name AS name from OGraphEdge where " +
			"_in traverse(3,3) (klass = 'User' and @rid = #5:" + userID + " )"+
			"and _out.klass = 'Module' and _label = 'HAS_ACCESS_TO'", callback
		);
	});
};

this.getUsersModule = function(modid, userID, callback) {
    
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.sql(
            
            "select name as module,dir from VModule where name = '" + modid + "' and in traverse(5,8) (@rid = #7:" + userID + ")",
            callback
        );
	});
};

this.getUsersComp = function( userID, compID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
		
		if( err ) callback( err );
		else db.sql(
			
			"select name as module,dir,in[@class = 'EHasAccessTo'].config as config,"+
			"in[@class = 'EHasAccessTo'].html as html,"+
			"in[@class = 'EHasAccessTo'].css as css "+
			"from VModule where in traverse(5,8) (@rid = #7:"+ userID +" ) "+
			"and in traverse(2,2) (@rid = #11:"+ compID +")",
			callback
		);
	});
};

this.getDomainsPublicUser = function(domain, callback) {
	
	orient(CONFIG.orientDB, function(err, db){
	
		if( err ) callback( err );
		else db.sql(
            
            "select publicUser from VDomain where name = '" + domain + "'",
            callback
        );
	});
};

// !----------------------------------------------------------------------------------------

this.getRole = function( roleID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
		
		if( err ) callback( err );
		else db.getVertex( "5:" + roleID, "name,desc", callback );
	});
};

this.insertRole = function( name, desc, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
		
		if( err ) callback( err );
		else db.addVertex( "OGraphVertex", { name: name, desc: desc, klass: "Role" }, callback );
	});
};

this.updateRole = function( roleID, data, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
		
		if( err ) callback( err );
		else db.updateVertex( "5:" + roleID, data, callback );
	});
};

this.removeRole = function( roleID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeVertex( "5:" + roleID, callback );
	});
};

// !----------------------------------------------------------------------------------------

this.getUser = function( userID, fields, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.getVertex( "5:" + userID, fields, callback );
	});
};

this.insertUser = function( data, callback ){
	
	if( data ) {
		
		data.klass = "User";
		
		orient( CONFIG.orientDB, function( err, db ){
		
			if( err ) callback( err );
			else db.addVertex( "OGraphVertex", data, callback );
		});
	}
	else callback( new Error( "No Data provided." ) );
};

this.updateUser = function( userID, data, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.updateVertex( "5:" + userID, data, callback );
	});
};

this.removeUser = function( userID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeVertex( "5:" + userID, callback );
	});
};

// !----------------------------------------------------------------------------------------

this.getOperation = function( operationID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.getVertex( "5:" + operationID, "file,method", callback );
	});
};

this.insertOperation = function( file, method, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.addVertex( "OGraphVertex", { file: file, method: method, klass: "Operation" }, callback );
	});
};

this.updateOperation = function( operationID, data, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.updateVertex( "5:" + operationID, data, callback );
	});
};

this.removeOperation = function( operationID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeVertex( "5:" + operationID, callback );
	});
};

// !----------------------------------------------------------------------------------------

this.getUIElement = function( UIElementID, callback ){
	
	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.getVertex( "5:" + UIElementID, "", callback );
	});
};

this.insertUIElement = function( data, callback ){
	
	if( data ) {
		
		data.klass = "Module";
		
		orient( CONFIG.orientDB, function( err, db ){
		
			if( err ) callback( err );
			else db.addVertex( "OGraphVertex", data, callback );
		});
	}
	else callback( new Error( "No Data provided." ) );
};

this.updateUIElement = function( compID, data, callback ){

	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.updateVertex( "5:" + compID, data, callback );
	});
};

this.removeUIElement = function( compID, callback ){

	orient( CONFIG.orientDB, function( err, db ){
	
		if( err ) callback( err );
		else db.removeVertex( "5:" + compID, callback );
	});
};

// !----------------------------------------------------------------------------------------

this.getSession = function( sessionID, now, expire, callback ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.findAndModify(
			
			{ sid: sessionID, exp: { $gt: now } },
			[],
			{ exp: expire },
			{ fields: { _id: 0, uid: 1, data: 1 } },
			callback
		);
	});
};

this.startSession = function( session, callback ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.insert( session, callback );
	});
};

this.updateSession = function( sessionID, doc, callback ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.update({ sid: sessionID }, doc, callback );
	});
};

this.endAllUserSessions = function( userID, callback ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ uid: userID }, callback );
	});
};

this.endSessions = function( now, callback ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ exp: { $lt: now } }, callback );
	});
};

this.endSession = function( sessionID ){
	
	mongo( CONFIG.mongoDB.name, "sessions", function( err, db ){
		
		if( err ) callback( err, null );
		else db.remove({ sid: sessionID }, callback );
	});
};

// !----------------------------------------------------------------------------------------

this.checkNonce = function( nonceID, callback ){
	
	var self = this;
	
	mongo( CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		else db.findOne({ n: nonceID, t: { $gt: parseInt( new Date().getTime() / 1000, 5 ) } }, { _id: 0, n: 1}, function( err, nonce ){
			
			if( err ) callback( err );
			else self.removeNonce( nonceID, function( err ){
				
				if( err ) callback( err );
				else callback( null, nonce ? true : false );
			});
		});
	});
};

this.insertNonce = function(){
	
	mongo( CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		
		else {
			
			var nonce = {
				
				n: uuid( 13 ),
				t: parseInt( new Date().getTime() / 1000, 10 ) + 10
			};
			
			db.insert( nonce, function( err ){
				
				if( err ) callback( err );
				else callback( null, nonce.n );
			});
		}
	});
};

this.removeNonce = function( nonceID, callback ){
	
	mongo( CONFIG.mongoDB.name, "nonces", function( err, db ){
		
		if( err ) callback( err );
		else db.remove({ n: nonceID }, callback );
	});
};
