/*

TODO check the pending not 200 requests (seen with node-static, but check also http operation requests) 

*/
var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var EventEmitter = require('events').EventEmitter;
var M = require('./api').server;
var user_api = require('./api').user;

function send (link, code, data) {
    link.req.resume();
    link.send(code, data);
}

function operator (link) {
    var miid = link.operation.miid;
    var method = link.operation.method;
    
    // check for miid in cache
    if (!M.miids[miid])  {
        return send(link, 404, 'Miid not found.');
    }
    
    // check for miid in cache
    if (!M.miids[miid][method])  {
        return send(link, 404, 'Method not found.');
    }
    
    // call method whit moduleInstance as this
    M.miids[miid][method](link);
    link.req.resume();
}

function forwardRequest (link) {
    
    if (link.path[0] == M.config.coreKey) {
        
        if (link.path.length < 3) {
            return send(link, 404, 'Invalid operation url.');
        }
        
        // if no operation was found in the request URL
        if (!link.path[1] || !link.path[1]) {
            return send(link, 404, 'Missing module instance ID or operation name.');
        }
        
        // attach api
        link.API = link.path[1] === M.config.coreMiid ? M : user_api;
        
        link.operation = {
            miid: link.path[1],
            method: link.path[2]
        };
        
        link.path = link.path.slice(3);
        
        operator(link);
        
    } else {
        M.route(link);
        link.req.resume();
    }
}

function requestHandler (req, res) {
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    var link = new EventEmitter();
    link.req = req;
    link.res = res;
    link.send = M.send.sendHttp;
    link.path = path || [];
    link.query = url.query || {};
    link.pathname = url.pathname;
    
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
wss.on('connection', function(ws) {
        
    // TODO make link an instance of event emitter and the "this" of an operation
    // TODO the link should contain the api for the module programmer
    
    // ws link
    var link = new EventEmitter();
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
M.on('ready', function () {
    server.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
