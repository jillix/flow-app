/*

TODO check the pending not 200 requests (seen with node-static, but check also http operation requests) 

*/
require('./api');
var M = process.mono;
var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var route = require(M.config.paths.SERVER_ROOT + 'router');
var session = require(M.config.paths.SERVER_ROOT + 'session');
var send = require(M.config.paths.SERVER_ROOT + 'send');
var fn = function () {};

function resumeAndSend (link, code, data) {
    link.req.resume();
    link.send(code, data);
}

function operator (link) {
    var miid = link.operation.miid;
    var method = link.operation.method;
    
    // check for miid in cache
    if (!M.miids[miid])  {
        return resumeAndSend(link, 404, 'Miid not found.');
    }
    
    // check if a listener is registred on the miid
    if (M.miids[miid].listeners(method).length === 0)  {
        return resumeAndSend(link, 404, 'Event not found.');
    }
    
    // call method whit moduleInstance as this
    M.miids[miid].emit(method, link);
    link.req.resume();
}

function forwardRequest (link) {
    
    if (link.path[0] == M.config.coreKey) {
        
        if (link.path.length < 3) {
            return resumeAndSend(link, 404, 'Invalid operation url.');
        }
        
        // if no operation was found in the request URL
        if (!link.path[1] || !link.path[1]) {
            return resumeAndSend(link, 404, 'Missing module instance ID or operation name.');
        }
        
        link.operation = {
            miid: link.path[1],
            method: link.path[2]
        };
        
        link.path = link.path.slice(3);
        
        operator(link);
        
    } else {
        route(link);
        link.req.resume();
    }
}

function requestHandler (req, res) {
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = {};
    link.req = req;
    link.res = res;
    link.send = send.sendHttp;
    link.path = path || [];
    link.query = url.query || {};
    link.pathname = url.pathname;
    
    // invoke streaming api
    link.stream = send.stream(link);

    // set a empty response header object
    link.res.headers = {};
    
    // get the session
    session.get(link, forwardRequest);
}

function messageHandler (ws, link, data) {
    
    // TODO define a protocoll
    /*
        Request: ['miid', 'operation'[, {}, msgId]]
        Response: [miid, operation, err[, data, msgId]]
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
M.http = http.createServer(requestHandler);
// start ws server
M.ws = new WebSocketServer({server: M.http});
M.ws.on('connection', function(ws) {
    
    // ws link
    var link = {};
    
    link.ws = ws;
    link.send = send.sendWs;
    
    // http fake link (for compatibility reasons)
    link.req = {
        headers: ws.upgradeReq.headers,
        pause: fn,
        resume: fn
    };
    link.res = {headers: {}};
    link.query = {};
    link.pathname = '';
    link.stream = fn;
    
    // get the session
    session.get(link, function (link) {
        // listen to messages
        ws.on('message', function (data) {
            messageHandler(ws, link, data);
        });
    });
});

// start listen and write app id to stdout
M.on('ready', function () {
    M.http.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
