/* ========================================================== */
/* DO NOT WRITE ANYTHING ON STDOUT UNTIL THE LISTENER STARTED */
/* ========================================================== */
    
// load mono api
require("./api")(function () {
    
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

    // start http server
    http.createServer(requestHandler).listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.app.id.toString());
        /* ========================================== */
        /* AFTER THIS OUTPUT YOU CAN AGAIN USE STDOUT */
        /* ========================================== */
    });
});

