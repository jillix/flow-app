var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var send = require('./send');

// TODO add api to the link object instead using a global variable
var M = require('./api');

function requestHandler (req, res) {
    
    req.pause();
        
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = {
        req:        req,
        res:        res,
        send:       send.send,
        path:       path,
        //query:      url.query || {},
        pathname:   url.pathname
    };
    
    // invoke streaming api
    link.stream = send.stream(link);

    // set a empty response header object
    link.res.headers = {};
    
    
    // handle post requests
    if (req.method === 'post') {
        // TODO handle data upload with operations
        return;
    }
    
    // TODO handle core requests
    if (link.path[0] === M.config.coreKey) {
        return M.getClient(link);
    }
    
    // call router
    
    // TODO get the session
    //M.session.get(link, forwardRequest);
    
    M.route(link);
}

function messageHandler (ws, data) {
    
    // TODO compression? not yet standartized in the websockets draft
    // TODO define a protocoll
    /*
        Request: ['miid', 'operation'[, {}, msgId]]
        Response: [status, data]
    */
    // TODO how to get the session? only once on connect? check the ws object (ws.upgradeReq.headers)
    // TODO messages are operation calls
    // TODO html snippet requests -> core request
    
    // parse data
    try {
        data = JSON.parse(data);
    } catch (err) {
        data = err.toString();
    }
    
    ws.send('server response: ' + data);
}

// start http server
var server = http.createServer(requestHandler);

// start ws server
var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
    
    // TODO here we could count connections
    // TODO how to broadcast messages?
    
    ws.on('message', function (data) {
        messageHandler(ws, data);
    });
});

// start listen and write app id to stdout
server.listen(process.env.port, process.env.host, function () {
    process.stdout.write(process.env.app);
});
