// load mono api
require("../../api");

var http = require("http");
var parse = require("url").parse;

// imported functions
var send = require("./send");
var operator = require("./operator");
var route = require("./router");

var start = 0;

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
        console.log((new Date().getTime() - start) / 1000 + 's | operator');
        operator.operation(link);
        
    } else {
        console.log((new Date().getTime() - start) / 1000 + 's | router');
        route(link);
    }
}

function requestHandler (req, res) {
    start = new Date().getTime();
    req.pause();
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = {
            req:        req,
            res:        res,
            send:       send,
            path:       path,
            query:      url.query || {},
            pathname:   url.pathname,
            session:    {
                loc: M.config.app.locale || "*",
                rid: M.config.app.publicRole
            }
        };
    
    // set a empty response header object
    link.res.headers = {};
    
    // TEMP
    M.config.app.session = true;
    link.req.headers.cookie = 'sid=0123456789; sonst=was';
    
    // get the session or start one
    if (M.config.app.session && link.req.headers.cookie) {
        return M.session.get(link, forwardRequest);
    }
    
    forwardRequest(link);
}

// start application server
if (!M.config.app.id) {
    console.error("This server cannot be started without and application ID");
    process.exit(1);
}

// establish the database connection
M.orient.connect (function(err, db) {

    if (err) {
        console.error("Could not connect to the Orient database.");
        console.error(err);
        process.exit(1);
    }
    
    if (isNaN(M.config.app.publicRole)) {
        console.error("Could not determine the public user for application: " + M.config.app.id);
        process.exit(2);
    }
    
    // start http server
    http.createServer(requestHandler).listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.app.id);
    });
});
