var util = require("util");

exports.send = (function() {
    
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

    for (var statusCode in functionTable) {

        // we need a loop closure since we define functions inside
        (function (statusCode) {

            var name = functionTable[statusCode].name;
            var logLevel = functionTable[statusCode].logLevel;
            var statusCode = parseInt(statusCode);

            // for non-error responses
            if (statusCode < 400) {

                functions[name] = function() {

                    // this way one can also pass a mono link object literal to the send functions
                    var res = this.res || {};
                    var req = this.req || {};
                    var url = req.url || "MISSING_URL";

                    log(logLevel, statusCode + " " + url);

                    res.writeHead(statusCode, res.headers || ct);
                    res.end();
                };
            }
            // for error responses
            else {

                functions[name] = function(message) {

                    if (this.resume) {
                        this.resume(true);
                    }

                    // this way one can also pass a mono link object literal to the send functions
                    var res = this.res; || {};
                    var req = this.req || {};
                    var url = req.url || "MISSING_URL";

                    log(logLevel, statusCode + " " + url);

                    // now log the error message
                    if (message === null || message === undefined) {
                        message = "";
                    }

                    switch (typeof message) {

                        case "object":
                            message = JSON.stringify(message);
                            break;

                        case "function":
                            log("warning", "The second argument to a send function must not be a function")
                            message = "";
                            break;

                        // if message is of type string, number, or boolean it remains the same
                    }

                    log("debug", new Error(message).stack)

                    res.writeHead(statusCode, res.headers || ct);
                    res.end(message || null);
                };
            }

        })(statusCode);
    }

    functions.ok = function(send) {

        try {

            if (typeof send != "undefined" ) {

                if (send instanceof Buffer === false) {

                    if (typeof send === "object") {
                        send = JSON.stringify( send );
                        this.res.headers[ 'content-type' ] = "application/json; charset=utf-8";
                    }
                    else {
                        send = send.toString();
                    }
                }

                this.res.writeHead(200, this.res.headers || ct);
                this.res.end(send);
            }
            else {
                this.res.writeHead( 204, this.res.headers || ct );
                this.res.end('');
            }
        }
        catch (err){
            this.res.writeHead( 500, ct );
            this.res.end( "Send Data: Parse Error" );
        }
    };
    
    return functions;

})();


function log(level, message) {

    switch (M.config.logLevel) {

        case "verbose":
            if (level === "verbose") {
                util.log("VERBOSE: " + message);
                break;
            }

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
