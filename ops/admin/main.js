var files = new ( require( "node-static" ).Server )(  process.env.ROOT + "/files/apps/admin/pub" );
	
//static file server ( ONLY PUBLIC FILES )
this.public = function( link ){
	
	if( link.path ) link.req.url = link.path.join( "/" );
	
	files.serve( link.req, link.res );
};