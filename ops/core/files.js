var send	= require( process.env.ROOT + "/core/send" ).send,
	getUIE	= require( process.env.ROOT + "/db/queries" ).getUsersUIElement,
	modules	= new ( require( "node-static" ).Server )( process.env.ROOT + "/files/modules" ),
	Nscript	= process.env.DEV ? "N.dev.js" : "N.js",
	Rscript = process.env.DEV ? "require.dev.js" : "require.js";

//send initial html and javascript
this.index = function( link ) {
	
	//set headers
	link.res.headers['content-style-type'] = "text/css";
	link.res.headers['content-type'] = "text/html; charset=utf-8";
	
	send.ok( link.res, '<!DOCTYPE html><html><head><script data-main="11/' + Nscript + '" src="11/' + Rscript + '"></script></head><body></body></html>' );
};

//ui modules ( controllers )
// !TODO: optimize performance
this.modules = function( link ) {
	
	if( link.path[ 0 ] == Nscript || link.path[ 0 ] == Rscript ) {
		
		link.req.url = link.path.join( "/" );
		modules.serve( link.req, link.res );
	}
	else if( link.path && typeof link.path[ 0 ] != "undefined" ) {
		
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