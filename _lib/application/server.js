var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var send = require('./send');
var M = require('./api');

function forwardRequest (link) {
        
    if (link.path[0] == M.config.coreKey) {
        
        if (link.path.length < 3) {
            return link.send(400, "Invalid operation url");
        }
        
        link.operation = {
            miid: link.path[1],
            method: link.path[2]
        };
        
        link.path = link.path.slice(3);
        
        M.operator.operation(link);
        
    } else {
        M.route(link);
    }
}

function requestHandler (req, res) {
    
    req.pause();
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = {
        req:        req,
        res:        res,
        send:       send.sendHttp,
        path:       path || [],
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

function messageHandler (ws, link, data) {
    
    // TODO define a protocoll
    /*
        Request: ['miid', 'operation'[, {}, msgId]]
        Response: [status, data]
    */
    
    // parse data
    try {
        data = JSON.parse(data.toString());
    } catch (err) {
        // TODO handle error
         ws.send('{"msg":"' + err.message + '"}');
    }
    
    link.data = data[2] || {};
    link.path = [M.config.coreKey, data[0], data[1]];
    
    forwardRequest(link);
}

// start http server
var server = http.createServer(requestHandler);
// start ws server
var wss = new WebSocketServer({server: server});

M.on('ready', function () {
    wss.on('connection', function(ws) {
        
        // ws link
        var link = {ws: ws};
        link.send = send.sendWs;
        
        // http fake link (for compatibility reasons)
        link.req = {headers: ws.upgradeReq.headers};
        link.res = {headers: {}};
        link.query = {};
        link.pathname = '';
        link.stream = function () {};
        
        // get the session
        M.session.get(link, function (link) {
            // listen to messages
            ws.on('message', function (data) {
                messageHandler(ws, link, data);
            });
        });
    });
    
    // start listen and write app id to stdout
    server.listen(process.env.port, process.env.host, function () {
        process.stdout.write(process.env.app);
    });
});
