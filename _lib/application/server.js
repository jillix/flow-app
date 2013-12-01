var http = require("http");
var WebSocketServer = require('ws').Server;

// TODO add api to the link object instead using a global variable

var api = require('./api');

function requestHandler (req, res) {
    
    console.log('http request');
    
    // TODO send http requests to router, except getModule core requests
    
    res.end(
        "<!DOCTYPE html><html><head>\n" +
            "<title>Mono Websockets</title>" +
            "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>\n" +
            "<script type='text/javascript'>\n" +
                "var webSocket = new WebSocket('ws://' + window.location.host + '/');" +
                "webSocket.onclose = function () {console.log('ws closed')};" +
                "webSocket.onerror = function () {console.log('ws error')};" +
            "</script>\n" +
        "</head><body></body></html>"
    );
}

function messageHandler (ws, data) {
    
    // TODO compression? not yet standartized in the websockets draft
    // TODO define a protocoll
    /*
        Request: ['miid', 'operation', {}]
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
