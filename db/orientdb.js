var http	= require( "http" ),
	Vertex	= 5,
	Edge	= 6;

// !TODO: communicate over sockets with Binary-Protocoll instead over HTTP ( http://code.google.com/p/orient/wiki/NetworkBinaryProtocol );
// !TODO: check removeEdge function, when multiple edges exists with the same label from the same vertex

this.db = (function(){
	
	//open database connection
	function connect( key, callback ) { /* PRIVATE */
	
		var self = this;
		
		execRequest.call( this, "/connect/" + this.databaseName, null, null, function( err, res ){
		
			if( err ) callback( err );
			
			else {
				
				dbCache[ key ] = self;
				
				self.databaseInfo = res;
				self.response = null;
				
				callback( null, self );
			}
		});
	}
	
	//execute http request
	function execRequest( path, type, data, callback ) { /* PRIVATE */
	
		var self = this,
			type = type || ( data ? "POST" : "GET" ),
			header = {
			
				Authorization: "Basic " + new Buffer( this.userName + ":" + this.userPass ).toString( "base64" )
			};
		
		if( data ) {
		
			header[ 'Content-Type' ] = "application/json";
			header[ 'Content-Length' ] = Buffer.byteLength( data ,"utf8" );
		}
		
		var request = http.request({
			
			method:		type,
			port:		this.databasePort, 
			host:		this.databaseHost,  
			path:		path,
			headers:	header
			
		}, function( res ){
			
			var resData = "", err;
			
			res.on( "data", function( chunk ){
			
				resData += chunk;
			});
			
			res.on( "end", function(){
				
				//try to parse response
				if( res.statusCode < 400 ) {
					
					try { resData = JSON.parse( resData ); }
					catch( parseError ) {
						
						// !TODO: check this on multiple inserts and updates
						
						//get @rid from non JSON results
						resData = resData.match( /([0-9]+:[0-9]+)/ );
						
						if( !resData || ( resData && !resData[ 0 ] ) ) err = parseError;
						else resData = resData[ 0 ];
					}
				}
				else err = new Error( resData || "Request ended with Status-Code: " + res.statusCode );
				
				//response failed
				if( err ) callback( err );
				else {
					
					resData = resData.result ? resData.result : resData;
					
					callback( null, resData.length == 1 ? resData[ 0 ] : resData );
				}
			});
			
		});
		
		request.on( "error", function( err ){ callback( err ); });
		if( data ) request.write( data );
		request.end();
	}
	
	function createDatabase( key, type, callback ){ /* PRIVATE */
		
		var self = this;
			
		execRequest.call(
		    
		    this,
		    "/database/" + this.databaseName + "/" + ( type || "local" ),
		    "POST",
		    null,
		    function( err, res ){
		    	
		    	if( err ) callback( err );
		    	else {
		    		
		    		self.databaseInfo = res;
					self.response = null;
					
					setupGraph.call( self, callback );
		    	}
		    }
		);
	}
	
	// TODO: this function is not working because over http you have no rights to execute this commands
	function setupGraph( callback ){ /* PRIVATE */
		
		/* COPY THIS TO YOUR CONSOLE ..'cause this function don't work
		
			create database remote:localhost/mono root 98FD9D92A49FD0765CC237ABBB271B9787CE8C366EA1479E023A2613EFDD6A5C local;
			create class OGraphVertex;
			create class OGraphEdge;
			create property OGraphVertex._class string;
			create property OGraphVertex._out linkset OGraphEdge;
			create property OGraphVertex._in linkset OGraphEdge;
			create property OGraphEdge._label string;
			create property OGraphEdge._out link OGraphVertex;
			create property OGraphEdge._in link OGraphVertex;
			create index classes on OGraphVertex ( _class ) notunique;
			//create index edges on OGraphEdge ( _label, _in, _out ) unique;
		*/
		
		var self = this;
		
		//create class OGraphVertex
		self.sql( "create class OGraphVertex", function( err ){
		    
		    if( err ) callback( err );
		    
		    //create class OGraphEdge
		    else self.sql( "create class OGraphEdge", function( err ){
		    	
		    	if( err ) callback( err );
		    	
		    	//create property outEdges on OGraphVertex type linklist bound to OGraphEdge
		    	else self.sql( "create property OGraphVertex._out linklist OGraphEdge", function( err ){
		    	
		    		if( err ) callback( err );
		    		
		    		//create property inEdges on OGraphVertex type linklist bound to OGraphEdge
		    		else self.sql( "create property OGraphVertex._in linklist OGraphEdge", function( err ){
		    		
		    			if( err ) callback( err );
		    			
		    			//create property out on OGraphEdge type link bound to OGraphVertex
		    			else self.sql( "create property OGraphEdge._out link OGraphVertex", function( err ){
		    			
		    				if( err ) callback( err );
		    				
		    				//create property in on OGraphEdge type link bound to OGraphVertex
		    				else self.sql( "create property OGraphEdge._in link OGraphVertex", function( err ){
		    				
		    					if( err ) callback( err );
		    					else {
		    						
		    						dbCache[ key ] = self;
		    						callback( null, self );
		    					}
		    				});
		    			});
		    		});
		    	});
		    });
		});
	}
	
	var DB = {
		
		// !TODO: test multiple inserts, multiple updates, update
		sql: function( command, callback ){
			
			execRequest.call( this, "/command/" + this.databaseName + "/sql", "POST", command, callback );
		},
		
		getVertex: function( rid, fields, callback ){
			
			rid = rid.replace( /[^0-9:]/, "" );
			
			if( rid != "" ) this.sql( "select " + ( fields || "" ) + " from #" + rid, callback ); // !Insecure!!
			else callback( new Error( "Invalid RecordID." ) );
		},
		
		addVertex: function( _class, data, callback ){
			
			var err;
			
			if( !data ) data = {};
			
			data[ '@class' ] = _class;
			
			try{ data = JSON.stringify( data ); }
			catch( stringifyError ){ err = stringifyError; }
			
			if( err ) callback( err );
			else execRequest.call( this, "/document/" + this.databaseName, "POST", data, callback );
		},
		
		removeVertex: function( rid, callback ){
			
			rid = rid.replace( /[^0-9:]/, "" );
			
			if( rid != "" ) this.sql( "delete from #" + rid, callback );
			else callback( new Error( "Invalid RecordID." ) );
		},
		
		updateVertex: function( rid, data, callback ){
			
			rid = rid.replace( /[^0-9:]/, "" );
			
			if( rid != "" ) {
				
				var err;
				
				data[ '@version' ] = -1;
				
				try{ data = JSON.stringify( data ); }
				catch( stringifyError ){ err = stringifyError; }
				
				if( err ) callback( err );
				else execRequest.call( this, "/document/" + this.databaseName + "/" + rid, "PUT", data, callback );
				
			}
			else callback( new Error( "Invalid RecordID." ) );
		},
		
		addEdge: function( from, to, label, data, callback ){
			
			var self = this;
			
			if( !data ) data = {};
	
			data[ '_label' ]	= label;
			data[ '_in' ]	= "#" + from;
			data[ '_out' ]	= "#" + to;
			
			//create edge with properties
			this.addVertex( "OGraphEdge", data, function( err, rid ){
					
				if( err ) callback( err ); // !TODO: roll back on error
				else if( rid ) self.sql( "update #" + from + " add _out = #" + rid, function( err ){
				    
				    if( err ) callback( err ); // !TODO: roll back on error
				    else self.sql( "update #" + to + " add _in = #" + rid, callback );
				});
			});
		},
		
		removeEdge: function( rid, label, callback ){
			
			var self = this;
			
			// !Insecure!!
			this.sql( "select _out[_label='" + label + "'] AS E,_out[_label='" + label + "']._out AS O from #" + rid, function( err, res ){
			
				if( err ) callback( err );
				
				//check if link is complete
				else if( res && res.E && res.O ) {
					
					//remove outEdges
					self.sql( "UPDATE " + res.O + " REMOVE _in = " + res.E, function( err ){
					    
					    if( err ) callback( err ); // !TODO: roll back on error
					    
					    //remove inEdges
					    else self.sql( "UPDATE #" + rid + " REMOVE _out = " + res.E, function( err ){
					    	
					    	if( err ) callback( err ); // !TODO: roll back on error
					    	
					    	//remove edge
					    	else self.sql( "DELETE FROM " + res.E, callback );
					    });
					});
				}
				else callback( new Error( "Link don't exists." ) )
			});
		},
		
		getDatabseInfo: function( callback ){
			
			execRequest.call( this, "/database/" + this.databaseName, null, null, callback );
		},
		
		listDatabases: function( callback ) {
			
			execRequest.call( this, "/listDatabases", null, null, callback);
		},
		
		disconnect: function( callback ){
			
			execRequest.call( this, "/disconnect", null, null, callback );
		},
		
		storageInfo: function( callback ){
			
			execRequest.call( this, "/allocation", null, null, callback);
		},
		
		serverInfo: function( callback ){
			
			execRequest.call( this, "/server", null, null, callback);
		},
		
		// !TODO: stream from file or newtwork
		import: function( data, callback ){
			
			execRequest.call( this, "/import/" + this.databaseName, "POST", data, callback );
		},
		
		// !TODO: stream to file or network
		export: function( callback ){
			
			execRequest.call( this, "/export/" + this.databaseName, null, null, callback );
		}
	},
	
	dbCache = {};
	
	/**
	 * CONSTRUCTOR function( options, callback )
	 * 
	 * IF THE OPTIONS ARE NOT SET, THIS FUNCTION TRIES TO CONNECT TO THE DEMO ORIENTDB DATABASE!
	 *
	 * param @options {Object} Options to initialize
	 * options {
	 * 	host:			{String}	[required]
	 * 	port:			{Number}	[required]
	 *  dbName:			{String}	[required]
	 *	userName: 		{String} 	[required]
	 *	userPass: 		{String} 	[required]
	 * }
	 * 
	 */
	 // !TODO: buffer callbacks while db is opening..
	return function( config, callback ){
		
		var key = config.host+config.port+config.name+config.username;
		
		if( dbCache[ key ] ) callback( null, dbCache[ key ] );
		
		else if( dbCache[ key ] === null ) callback( new Error( "DB is still opening..." ) );
		else {
			
			dbCache[ key ] = null;
			
			var db = Object.clone( DB );
			
			db.databaseHost = config.host || "localhost";
			db.databasePort = config.port || 2480;
			db.databaseName = config.name || "demo";
			db.userName = config.username || "admin";
			db.userPass = config.password || "admin";
			
			if( config.create ) createDatabase.call( db, key, null, callback );
			else connect.call( db, key, callback );
		}
	};
})();