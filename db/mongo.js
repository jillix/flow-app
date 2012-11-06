var mongo = require( "mongodb" );

this.db = (function(){

	var pool = {},
		callback_buffer = {},
		def_host = "127.0.0.1",
		def_port = 27017,
		MAX_CALLBACKS_IN_BUFFER = 100;
	
	function callbacks( key, err, collection ) {
		
		var cb_buffer = callback_buffer[ key ];
		
		if( cb_buffer ){
		
			var length = cb_buffer.length;
			
			//execute callbacks in buffer
			if( length > 0 )
				for( var i=0; i < length; ++i )
					cb_buffer[i]( err, collection, close( key ) );
			
			callback_buffer[ key ] = [];
		}
	}
	
	function close( key ) {
		
		return function(){
			
			if( pool[ key ] ){
				
				 pool[ key ][0].close();
				 pool[ key ] = null;
				 delete pool[ key ];
			}
        };
	}
	
	return function( db_name, collection_name, host, port, callback ){
		
		//take default host and port, if no host or port is set
		if( arguments.length == 3 ) {
		
			callback = arguments[2];
			host = def_host;
			port = def_port;
		}
		
		//create connection key
		var key = host + port + db_name + collection_name;
		
		if( !callback_buffer[ key ] ) callback_buffer[ key ] = [];
		
		if( pool[ key ] ) callback( null, pool[ key ][1], close( key ) );
		
		//buffer callbacks
		else if( pool[ key ] === false ) {
			
			if( callback_buffer[ key ].length < MAX_CALLBACKS_IN_BUFFER ) callback_buffer[ key ].push( callback );
			else callback( new Error( "mono: db: max callbacks in buffer exceeded" ) );
		}
		
		//create connection	
		else {
			
			pool[ key ] = false;
			
			callback_buffer[ key ].push( callback );
			
			new mongo.Db( db_name, new mongo.Server( host, port), { native_parser: true, safe: false }).open(function( err, db ){
				
			    if( err ) callbacks( key, err, null );
			    
			    //create collection
			    else db.collection( collection_name, function( err, collection ){
                    
			        if( err ) callbacks( key, err, null );
			        
			        else {
                        
                        //cache collection
                        pool[ key ] = [ db, collection ];
                        
                        //retrun collection
                        callbacks( key, null, collection );
			        }
			    });
			});
		}
    };
})();