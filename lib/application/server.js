// load mono api
require("../../api");

var http = require("http");
var parse = require("url").parse;

// imported functions
var send = require("./send");
var operator = require("./operator");
var route = require("./router");

function forwardRequest (link) {
    
    if (link.path[0] == M.config.operationKey) {
        
        if (link.path.length < 3) {
            return link.send(400, "Invalid operation url");
        }
        
        link.operation = {
            module: link.path[1],
            method: link.path[2]
        };
        
        link.path = link.path.slice(3);
        
        operator.operation(link);
        
    } else {
        route(link);
    }
}

function requestHandler (req, res) {
    
    req.pause();
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = {
            req:        req,
            res:        res,
            send:       send.send,
            path:       path,
            query:      url.query || {},
            pathname:   url.pathname
        };
    
    // invoke streaming api
    link.stream = send.stream(link);

    // set a empty response header object
    link.res.headers = {};
    
    // get the session
    M.session.get(link, forwardRequest);
}

/* ========================================================== */
/* DO NOT WRITE ANYTHING ON STDOUT UNTIL THE LISTENER STARTED */
/* ========================================================== */

// start application server
if (!M.config.app) {
    console.error("This server cannot be started without an application ID");
    process.exit(1);
}

// establish the database connection
M.mongo.connect(M.config.mongoDB.name, function(err, db) {

    if (err) {
        console.error("Could not connect to MongoDB");
        console.error(err);
        process.exit(2);
    }

    M.app.get(M.config.app, function(err, application) {

        if (err) {
            console.error(err.message || err.toString());
            process.exit(3);
        }

        M.config.app = application;

        // TODO remove this and add it to a M.app.validate function that fails if something is not OK with the app
        //      - the app does not have public role (this should be enforced through the database)
        //      - the user owning the app cannot start more application
        //      - the app is under quatantine
        //      - etc.
        if (isNaN(M.config.app.publicRole)) {
            console.error("Could not determine the public user for application: " + M.config.app.id);
            process.exit(4);
        }

        // start http server
        http.createServer(requestHandler).listen(M.config.port, M.config.host, function () {
            process.stdout.write(M.config.app.id);
            /* ========================================== */
            /* AFTER THIS OUTPUT YOU CAN AGAIN USE STDOUT */
            /* ========================================== */
        });
    });
});

