// SEND
//---------------------------------------------------------------------------------*
this.send = (function(){
    
    var ct = { 'content-type': "text/plain" };
    
	return {
		
		ok: function( res, send ){
            
            try {
                
                if( typeof send != "undefined" ) {
                
                    if( send instanceof Buffer === false ){
                            
                        if( typeof send == "object" ) {
                            
                            send = JSON.stringify( send );
                            res.headers[ 'content-type' ] = "application/json; charset=utf-8";
                        }
                        else send = send.toString();
                    }
                    
                    res.writeHead( 200, res.headers || ct );
                    res.end( send );
                }
			    else {
                    
                    res.writeHead( 204, res.headers || ct );
                    res.end();
			    }
            }
			catch( err ){
                
                res.writeHead( 500, ct );
                res.end( "Send Data: Parse Error" );
            }
		},
		
		created: function( res ){
			
			res.writeHead( 201, res.headers || ct );
			res.end();
		},
		
		accepted: function( res ){
			
			res.writeHead( 202, res.headers || ct );
			res.end();
		},
		
		found: function( res ){
			
			res.writeHead( 302, res.headers || ct );
			res.end();
		},
		
		seeother: function( res ){
			
			res.writeHead( 303, res.headers || ct );
			res.end();
		},
		
		//CLIENT 4xx
		badrequest: function( res, msg ){
			
			res.writeHead( 400, ct );
			res.end( msg || null );
		},
		
		forbidden: function( res, msg ){
			
			res.writeHead( 403, ct );
			res.end( msg || null );
		},
		
		notfound: function( res, msg ){
			
			res.writeHead( 404, ct );
			res.end( msg || null );
		},
		
		imateapot: function( res, msg ){
			
			res.writeHead( 418, ct );
			res.end( msg || null );
		},
		
		//SERVER 5xx
		internalservererror: function( res, msg ){
			
			res.writeHead( 500, ct );
			res.end( msg || null );
		},
		
		serviceunavailable: function( res, msg ){
			
			res.writeHead( 503, ct );
			res.end( msg || null );
		}
	};

})();

this.mongoStream = (function(){
    
    return function( link, source, cursor ) {
    
        link.res.writeHead( 200, { "content-type": "application/json; charset=utf-8" } );
        link.res.write( "[" );
        
        var komma = "";
        var stream = function stream( err, item ){
        
            if( err ) {
                
                link.res.writeHead( 500, "text/plain" );
                link.res.end();
            }
            else if( item !== null ) {
                
                try {
                    
                    //remove this if mongodb supports a positional operator ($) in queries.
                    //https://jira.mongodb.org/browse/SERVER-828
                    if( item._s ) for( var i=0, l=item._s.length; i<l; ++i ) {
                        
                        if( item._s[ i ] && item._s[ i ].n == source ) {
                            
                            if( item._s[ i ].p ) item._p = item._s[ i ].p;
                            if( item._s[ i ].b ) item._b = item._s[ i ].b;
                            
                            delete item._s;
                            
                            break;
                        }
                    }
                    
                    link.res.write( komma + JSON.stringify( item ) );
                    
                    if( !komma ) komma = ",";
                    
                    cursor.nextObject( stream );
                }
                catch( e ) {
                    
                    link.res.writeHead( 500, "text/plain" );
                    link.res.end();
                }
            }
            else link.res.end( "]" );
        };
        
        cursor.nextObject( stream );
    };
})();