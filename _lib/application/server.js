var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var EventEmitter = require('events').EventEmitter;
var M = require('./api').server;
var user_api = require('./api').user;

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
        API:        user_api,
        req:        req,
        res:        res,
        send:       M.send.sendHttp,
        path:       path || [],
        query:      url.query || {},
        pathname:   url.pathname
    };
    
    // invoke streaming api
    link.stream = M.send.stream(link);

    // set a empty response header object
    link.res.headers = {};
    
    // get the session
    M.session.get(link, forwardRequest);
}

function messageHandler (ws, link, data) {
    
    // TODO define a protocoll
    /*
        Request: ['miid', 'operation'[, {}, msgId]]
        Response: [miid, operation, err, data]
    */
    
    // parse data
    try {
        data = JSON.parse(data.toString());
    } catch (err) {
        // TODO handle error
         return ws.send('400 Bad request');
    }
    
    link.data = data[2];
    link.msgId = data[3] || null;
    link.path = [M.config.coreKey, data[0], data[1]];
    
    forwardRequest(link);
}

// start http server
var server = http.createServer(requestHandler);
// start ws server
var wss = new WebSocketServer({server: server});

M.on('ready', function () {
    wss.on('connection', function(ws) {
        
        // TODO make link an instance of event emitter and the "this" of an operation
        // TODO the link should contain the api for the module programmer
        
        // ws link
        var link = new EventEmitter();
        link.API = user_api;
        link.ws = ws;
        link.send = M.send.sendWs;
        
        // http fake link (for compatibility reasons)
        link.req = {
            headers: ws.upgradeReq.headers,
            pause: function () {},
            resume: function () {}
        };
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
    server.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
