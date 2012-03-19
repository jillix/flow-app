var util = require("util");


this.send = (function(){
    
    var ct = { 'content-type': "text/plain" };

    var functionTable = {

        201: { name: "created", logLevel: "none" },
        202: { name: "accepted", logLevel: "none" },

        302: { name: "found", logLevel: "none" },
        303: { name: "seeother", logLevel: "none" },

        400: { name: "badrequest", logLevel: "error" },
        403: { name: "forbidden", logLevel: "error" },
        404: { name: "notfound", logLevel: "error" },
        418: { name: "imateapot", logLevel: "error" },

        500: { name: "internalservererror", logLevel: "error" },
        503: { name: "serviceunavailable", logLevel: "error" },
    };

    var functions = {};

    function warnOldUsage() {
        log("debug", new Error("Please pass the mono link object literal to the send.js functions").stack);
    }

    for (var statusCode in functionTable) {

        // we need a loop closure since we define functions inside
        (function (statusCode) {

            var name = functionTable[statusCode].name;
            var logLevel = functionTable[statusCode].logLevel;
            var statusCode = parseInt(statusCode);

            // for non-error responses
            if (statusCode < 400) {

                functions[name] = function(link) {

                    // this way one can also pass a mono link object literal to the send functions
                    var res = link.res || link;
                    var req = link.req || {};
                    var url = req.url || "MISSING_URL";

                    log(logLevel, statusCode + " " + url);

                    if (!req.url) {
                        warnOldUsage();
                    }

                    res.writeHead(statusCode, res.headers || ct);
                    res.end();
		        };
            }
            // for error responses
            else {

                functions[name] = function(link, msg) {

                    // this way one can also pass a mono link object literal to the send functions
                    var res = link.res || link;
                    var req = link.req || {};
                    var url = req.url || "MISSING_URL";
                    msg = msg ? " " + msg : "";

                    log(logLevel, statusCode + " " + url + msg);

                    if (!req.url) {
                        warnOldUsage();
                    }

	                res.writeHead(statusCode, ct);
	                res.end(msg || null);
                };
            }

        })(statusCode);
    }

    functions.ok = function(res, send) {

        try {

            if (typeof send != "undefined" ) {

                if (send instanceof Buffer === false) {

                    if (typeof send === "object") {
                        send = JSON.stringify( send );
                        res.headers[ 'content-type' ] = "application/json; charset=utf-8";
                    }
                    else {
                        send = send.toString();
                    }
                }

                res.writeHead(200, res.headers || ct);
                res.end(send);
            }
            else {
                res.writeHead( 204, res.headers || ct );
                res.end();
            }
        }
        catch (err){
            res.writeHead( 500, ct );
            res.end( "Send Data: Parse Error" );
        }
    };

    return functions;

})();


function log(level, message) {

    switch (CONFIG.logLevel) {

        case "debug":
            if (level === "debug") {
                util.log("DEBUG: " + message);
                break;
            }

        case "info":
            if (level === "info") {
                util.log("INFO: " + message);
                break;
            }

        case "warning":
            if (level === "warning") {
                util.log("WARNING: " + message);
                break;
            }

        case "error":
            if (level === "error") {
                util.log("ERROR: " + message);
                break;
            }
    }
}


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

