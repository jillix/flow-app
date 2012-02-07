/**
 * function start (options)
 *
 * param @options {Object} Options to start a daemon
 * option {
 *  script:			{String}	[optional/default: 'server.js'] script file to start
 * 	parameter:		{Array} 	[optional] parameter to pass to the script
 *	maxAttempts: 	{Number} 	[optional/default: 10] max restart attempts
 *	minUptime: 		{Number} 	[optional/default: 2000] how long the app has to be up (minimum time)
 *	spinSleepTime: 	{Number} 	[optional/default: 1000] time intervall of restart
 * }
 *
 * param @mail {String} specify notification email adress
 * 
 */

var forever		= require( "forever" ),
	nodemailer	= require( "nodemailer" ),
	util		= require( "util" );

var params = [ process.argv[ 2 ] || __dirname + "/config.js" ],
	config = require( params[ 0 ] ).forever || {},
	lastError = "";

if( config.mail ) {

    var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    
    if( !filter.test( config.mail ) )
    	throw new Error( "Error: Notification set active, but no valid mail has been set!" );
    
    nodemailer.sendmail = true;
}

//default values
config.maxAttempts		= config.maxAttempts	|| 23;
config.minUptime		= config.minUptime		|| 2000;
config.spinSleepTime	= config.spinSleepTime	|| 1000;

if( config.spinSleepTime >= config.minUptime ) throw new Error( "Error: spinSleepTime is greater than minUptime!" );

//watch node process
var server = new forever.Monitor( __dirname + "/core/proxy.js", {

	'max':				config.maxAttempts,
	'minUptime':		config.minUptime,
	'spinSleepTime':	config.spinSleepTime,
	'options':			params,
	'outFile':			"/dev/null",
	'errFile':			"/dev/null"
});

//file load error
server.on( "error", function(){
	
    util.log( "Error: Loading HTTP Server [ Parameter: " + params.join( ", " ) + " ] as daemon failed!" );
});

//process error
server.on( "stderr", function( err ) {
	
    lastError = err.toString( "utf8" );
});

//restart event
server.on( "restart", function() {

    util.log( "Info: Restarted HTTP Server [ Parameter: " + params.join( ", " ) + " ]!" );
    util.log( lastError );

    if( config.mail ) {
    
    	nodemailer.send_mail(
    	    {
    	        to:			config.mail,
    	        subject:	"Notification: HTTP Server [ Parameter: " + params.join( ", " ) + " ] crashed and restarted!",
    	        body:		"Error Log: \n" + lastError
    	    },
    	    function( err, success ) {
    	    
    	    	if( !success ) util.log( "Error: Notification sending failed!" );
    	    }
    	);
    }
});

//start node process
server.start();