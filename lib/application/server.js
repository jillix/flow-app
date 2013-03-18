// load mono api
require("../../api");

var http = require("http");
var parse = require("url").parse;
var connect = require("connect");

// imported functions
var send = require("./send");
var operator = require("./operator");
var route = require("./router");

function requestHandler(req, res) {
    
    if (!req.headers.host) {
        res.writeHead(400, {'content-type': 'text/plain'});
        return res.end("No host in request headers.");
    }
    
    req.pause();
    
    var url = parse(req.url, true),
        path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
        link = {
            req:        req,
            res:        res,
            query:      url.query || {},
            pathname:   url.pathname,
            host:       req.headers.host.split(':')[0],
            lang:       req.headers['accept-language'],
            send:       send
        };

    link.res.headers = {};
    
    if (path[0] == M.config.operationKey) {
        
        if (path.length < 3) {
            return link.send(400, "incorrect operation url");
        }
        
        link.operation = {
            module: path[1],
            method: path[2]
        };
        
        link.path = path.slice(3);

        operator.operation(link);
    }
    else {
        link.path = path;
        route(link);
    }
}

// start application server
if (!M.config.app.id) {
    console.error("This server cannot be started without and application ID");
    process.exit(1);
}

// establish the database connection
M.orient.connect(function(err, db) {

    if (err) {
        console.error("Could not connect to the Orient database.");
        console.error(err);
        process.exit(1);
    }
    
    if (isNaN(M.config.app.publicUser)) {
        console.error("Could not determine the public user for application: " + M.config.app.id);
        process.exit(2);
    }

    var handler = requestHandler;

    // TODO add an application session option
    // currently testing this with the TruckShop only
    if (M.config.app.session) {
        var cookieParser = connect.cookieParser();
        var session = connect.session({ secret: "mono", key: "mono.sid" });

        handler = function(req, res) {
            cookieParser(req, res, function() {
                req.originalUrl = req.url;
                session(req, res, function() {
                    req.session.appid = M.config.app.id;
                    req.session.uid = req.session.uid || publicUser;
                    requestHandler(req, res);
                });
            });
        }
    }
    
    // start http server
    http.createServer(handler).listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.app.id);
    });
});
