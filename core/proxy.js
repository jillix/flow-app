//extend Object with clone function
Object.clone = function( obj ) {
	
	function O(){}
	O.prototype = obj;
	return new O();
};

//get configuration
CONFIG = require( process.argv[ 2 ] );

//system database name
if( !CONFIG.orientDB || !CONFIG.mongoDB ) throw new Error( "No Database Config defined!" );

//set environment variables
process.env.ROOT		= CONFIG.root;
process.env.PUBLIC_USER	= CONFIG.public_user || "0";

//check for dev mode
if( CONFIG.dev ) process.env.DEV = 1;

//include modules
var http		= require( "http" ),
	parseurl	= require( "url" ).parse,
	util		= require( process.env.ROOT + "/core/util" ),
	send		= require( process.env.ROOT + "/core/send" ).send,
	getSession	= require( process.env.ROOT + "/core/session" ).get,
	formidable	= require( "formidable" );

//start http server
http.createServer(function( req, res ) {

	var url		= parseurl( req.url, true ),
		path	= url.pathname.replace( /\/$|^\//g, "" ).split( "/", 42 );
	
	//pause request on POST requests
	if( req.method == "POST" ) var resume = util.pause( req );
	
	//check if user has access to operation ( session )
	getSession(
		
		path[ 0 ].replace( /[^a-z0-9_\-]/gi, "" ) || CONFIG.default_operation,	//get operation id
		req.headers[ 'x-sid' ] || ( url.query ? url.query._s : null ),			//get session id
		function( err, operation, session ) {
			
			if( err || !operation || !operation.file || !operation.method ) {
				
				if (process.env.DEV) {
					
					console.log( err || new Error( "No Operation found.." ));
				}
				send.forbidden( res );
			}
			else {
				
				var method = util.load( operation.file, operation.method );
				
				if( typeof method == "function" ) {
					
					//create link
					var link = { res: res, req: req, session: session };
					
					//add pathinfo to link
					if( path[ 1 ] ) link.path = path.slice( 1 );
					
					//add query info to link
					if( url.query ) link.query = url.query;
					
					//set empty header object
					link.res.headers = {};
					
					//add operations envoirenment variables
					if( operation.env ) link.env = operation.env;
					if( operation.params ) link.params = operation.params;
					
					//handle get request
					if( typeof resume == "undefined" ) method( link );
					
					//handle post request
					else {
					
						var contentType = link.req.headers[ 'content-type' ] || "";
						
						//handle json requests
						if( contentType.indexOf( "application/json" ) > -1 ) {
							
							var jsonString = "", err;
							
							//buffer data
							link.req.on( "data", function( chunk ){ jsonString += chunk.toString( "utf-8" ); });
							
							//if all data are received 
							link.req.on( "end", function() {
								
								try { jsonString = jsonString ? JSON.parse( jsonString ) : {}; }
								catch( parseError ) {
									
									if( process.env.DEV ) console.log( parseError );
									
									err = parseError;
								}
								
								if( err ) send.badrequest( link.res );
								else method( link );
							});
						}
						//handle form data requests
						else if( contentType.indexOf( "multipart/form-data" ) > -1  ) {
							
							var form = new formidable.IncomingForm();
							
							//define upload dir for temporary files
							form.uploadDir = process.env.APPS + "/" + app.name + "/files/tmp";
							
							//parse form data
							form.parse( link.req, function( err, fields, files ) {
								
								if( err ) {
									
									if( process.env.DEV ) console.log( err );
									
									send.internalservererror( link.res );
								}
								else {
									
									link.data = fields;
									
									if( files ) for( var file in files ) link.data[ file ] = files[ file ];
									
									method( link );
								}
							});
						}
						else method( link );
						
						resume();
					}
				}
				else send.notfound( res );
			}
		}
	);
}).listen( 80 );