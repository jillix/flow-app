//var appPath = self.config.paths.APPLICATION_ROOT + application._id;
// the application directory must be present otherwise the piped
// streams below will crash the mono proxy server
//if (!fs.existsSync(appPath)) {
//    return callback(self.error(self.error.APP_DIR_NOT_FOUND, application._id));
//}
// write to application log
//var log = fs.createWriteStream(appPath + '/log.txt');
//app.stdout.pipe(log);
//app.stderr.pipe(log);

var http = require("http");
var WebSocketServer = require('ws').Server;

function requestHandler (req, res) {
    res.end(
        "<!DOCTYPE html><html><head>\n" +
            "<title>Mono Websockets</title>" +
            "<meta http-equiv='content-type' content='text/html; charset=utf-8'/>\n" +
            "<script type='text/javascript'>\n" +
                "var webSocket = new WebSocket('ws://' + window.location.host + '/');" +
            "</script>\n" +
        "</head><body></body></html>"
    );
}

// start http server
var server = http.createServer(requestHandler);
server.listen(process.env.port, process.env.host, function () {
    process.stdout.write(process.env.app);
});

// start ws server
wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
    
    ws.on('message', function (data, bo) {
        
        // parse data
        try {
            data = JSON.parse(data);
        } catch (err) {
            // handle error
            ws.send('400 Bad request\n' + err.toString());
        }
        
        console.log(data);
    });
    
    ws.on('close', function() {
        console.log('websocket connection close');
    });
});

wss.on('data', function (data) {
    console.log('server data' + data);
});
