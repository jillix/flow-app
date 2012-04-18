var //db = require( process.env.ROOT + "/mongo" ).db,
	rf = require( "fs" ).readFile,
	crypt = require( "crypto" ),
	send = require( process.env.ROOT + "/send" ).send,
	uuid = require( process.env.ROOT + "/util" ).uuid,
	session = require( process.env.ROOT + "/session" ),
	queries = require( process.env.ROOT + "/db/queries" ),
	checkAuthPub = /[^a-z0-1@-_.äöüèéàáùúìíóò]/gi,
	script_cache = {};

// !TODO: use sha256

/*
 *	description:	perform a direct login ( private key )
 *	params:			- query:		(object)	query object for mongo db
 *					- private_key:	(string)	the private key
 *					- public_key:	(string)	the public key
 *					- string:		(string)	string for comparison
 *					- callback:		(function)	callback function ( user data as first parameter )
 *	author:			Adrian Ottiker
 *	date:			18.11.2010
 */
this.direct = function( link, config, fn, callback ) {
	
	//happybonus directlogin test
	//console.log( require( "crypto" ).createHash( "sha1" ).update( "migrol.schoenbuehl@bluewin.ch" + "h2U9xhdF78ao0" ).digest( "hex" ) );
	//console.log( crypt.createHash( "sha1" ).update( "michel.fuchs@chauto.ch" + config.privateKey ).digest( "hex" ) );
	
	if(
		config.privateKey &&
		config.publicWord &&
		config.publicHash &&
		link.query &&
		link.query[ config.publicWord ] && 
		link.query[ config.publicHash ]
	){
		//check data
		if(
			crypt.createHash( "sha1" )
			.update( link.query[ config.publicWord ] + config.privateKey )
			.digest( "hex" ) == link.query[ config.publicHash ]
			
		//get user data
		) queries.getUserByAuthPub( link.query[ config.publicWord ].replace( checkAuthPub, "" ), "locale,@rid", function( err, user ){
				
			if( err ) callback( err );
			
			//start session
			else if( user && user.rid ) session.start( user.rid, user.locale || APP.locale, callback );
			else callback( new Error( "User not found.") );
		});
		
		else callback( new Error( "Access denied." ) );
	}
	else callback( new Error( "Invalid Data." ) );
};

/* 
*	description:	check the login parameters
*	params:			link
*	author:			Adrian Ottiker
*/
// !TODO: optional parameter for logging
// !TODO: track session in users object
this.login = function( link ) {
	
	//check if users is logged
	if( link && ( !link.session || !link.session.sid ) ) {
		
		//check if requested data is available
		if( link.data && link.data[ 0 ] && link.data[ 1 ] && link.data[ 2 ] ) {
			
			queries.getUserByAuthPub( link.data[ 0 ].replace( checkAuthPub, "" ), "auth[pub],locale,@rid", function( err, user ){
				
				if( err ) send.internalservererror( link.res );
				
				//check user if users exists
				else if( user && user.auth && user.auth.pwd ) queries.checkNonce( link.data[ 2 ], function( err, nonce ){
					
					if( err ) send.internalservererror( link.res );
					
					//check nonce and password
					else if( nonce && crypt.createHash( "sha1" ).update( link.data[ 2 ] + user.auth.pwd ).digest( "hex" ) == link.data[ 1 ] ){
						
						//start session
						session.start( user.rid, user.locale || APP.locale, function( err, ses ){
						
							if( err ) send.internalservererror( link.res );
							else {
								
								link.res.headers[ 'cache-control' ] = "no-cache";
								link.res.headers[ 'content-type' ] = "text/plain";
								link.res.headers[ 'x-sid' ] = ses.sid;
								send.ok( link.res, "1" );
							}
						});
					}
					else send.forbidden( link.res );
				});
				else send.forbidden( link.res );
			});
		}
		else send.badrequest( link.res );
	}
	else if( link.data && link.data[ 2 ] ){
		
		queries.removeNonce( link.data[ 2 ], function(){
			
			if( err ) send.internalservererror( link.res );
			else {
				
				link.res.headers[ 'cache-control' ] = "no-cache";
				ink.res.headers[ 'content-type' ] = "text/plain";	
				send.ok( link.res );
			}
		});
	}
	else send.badrequest( link.res );
};

this.nonce = function( link ){
	
	queries.insertNonce(function( err, nonceID ){
		
		if( err ) send.internalservererror( link.res );
		else {
			
			link.res.headers[ 'cache-control' ] = "no-cache";
			link.res.headers[ 'content-type' ] = "text/plain";
			send.ok( link.res, nonceID );
		}
	});
};

//end session on server
this.logout = function( link ){
	
	if( link && link.session && link.session.end ) link.session.end(function( err ){
		
		if( err ) send.internalservererror( link.res );
		else {
			
			link.res.headers[ 'content-type' ] = "text/plain";
			link.res.headers[ 'x-sid' ] = "N";
			send.ok( link.res, "1" );
		}
	});
	else send.forbidden( link.res );
};

//send sha1 hash generator
this.crypto = function( link ){
	
	link.res.headers[ "content-type" ] = "application/javascript";
	
	send.ok( link.res, "/*Crypto-JS v2.4.0 * http://code.google.com/p/crypto-js/ * Copyright (c) 2011, Jeff Mott. All rights reserved. * http://code.google.com/p/crypto-js/wiki/License */(function(){var l=Crypto,m=l.util,n=l.charenc,o=n.UTF8,p=n.Binary,j=l.SHA1=function(a,g){var c=m.wordsToBytes(j._sha1(a));return g&&g.asBytes?c:g&&g.asString?p.bytesToString(c):m.bytesToHex(c)};j._sha1=function(a){if(a.constructor==String)a=o.stringToBytes(a);var g=m.bytesToWords(a),c=a.length*8;a=[];var h=1732584193,d=-271733879,e=-1732584194,f=271733878,i=-1009589776;g[c>>5]|=128<<24-c%32;g[(c+64>>>9<<4)+15]=c;for(c=0;c<g.length;c+=16){for(var q=h,r=d,s=e,t=f,u=i,b=0;b<80;b++){if(b<16)a[b]=g[c+b];else{var k=a[b-3]^a[b-8]^a[b-14]^a[b-16];a[b]=k<<1|k>>>31}k=(h<<5|h>>>27)+i+(a[b]>>>0)+(b<20?(d&e|~d&f)+1518500249:b<40?(d^e^f)+1859775393:b<60?(d&e|d&f|e&f)-1894007588:(d^e^f)-899497514);i=f;f=e;e=d<<30|d>>>2;d=h;h=k}h+=q;d+=r;e+=s;f+=t;i+=u}return[h,d,e,f,i]};j._blocksize=16;j._digestsize=20})();" );
};