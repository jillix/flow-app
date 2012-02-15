var send	= require( process.env.ROOT + "/core/send" ).send,
	getUIE	= require( process.env.ROOT + "/db/queries" ).getUsersUIElement,
	modules	= new ( require( "node-static" ).Server )( process.env.ROOT + "/files/modules" );

//ui modules ( controllers )
this.getModule = function( link ) {
	
	if( link.path && typeof link.path[ 0 ] != "undefined" ) {
		
		var moduleName = link.path[ 0 ].replace( /[^0-9a-z_\-]/gi, "" );
		
		if( moduleName != "" ) getUIE( moduleName, link.session.uid, function( err, res ){
			
			if( err || !res.name ) send.notfound( link.res );
			else {
				
				link.req.url = link.path.join( "/" );
				
				modules.serve( link.req, link.res );
			}
		});
		else send.badrequest( link.res );
	}
	else send.badrequest( link.res );
};