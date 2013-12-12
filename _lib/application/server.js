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

M.broadcast = send.broadcast;

// handle http request
function requestHandler (req, res) {
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    
    if (path[0] == M.config.coreKey) {
    
        if (path.length < 3) {
            // TODO send error
            //return send(link, 404, 'Invalid operation url.');
        }
        
        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            // TODO send error
            //return send(link, 404, 'Missing module instance ID or operation name.');
        }
        
        // check if miid an operation exists
        if (M.miids[path[1]] && M.miids[path[1]][path[2]]) {
            var operation = M.miids[path[1]].clone();
            operation.link = {
                req: req,
                res: res,
                path: path.slice(3),
                query: url.query,
                pathname: url.pathname
            };
            
            // set a empty response header object
            link.res.headers = {};
            
            session.get(req.headers, function (session) {
                
                operation.link.session = session;
                
                // TODO call operation
                //M.miids[path[1]][path[2]].call(operation)
                //req.resume();
            });
            
        } else {
            // TODO not found
            //return resumeAndSend(link, 404, 'Miid or operation not found.');
        }
        
    } else {
        // TODO route
        route(link);
        req.resume();
    }
}

// start http server
M.http = http.createServer(requestHandler);

// start ws server
M.ws = new WebSocketServer({server: M.http});
M.ws.on('connection', function(ws) {
    
    // get the session
    session.get(ws.upgradeReq.headers, function (session) {
        
        // listen to messages
        ws.on('message', function (data) {
            
            // parse data
            try {
                data = JSON.parse(data.toString());
                
                // TODO check message integrity
                if (!data[0]) {
                    throw new Error('Bad message');
                }
            } catch (err) {
                // TODO handle error
                return ws.send('400 ' + err.message);
            }
            
            // mono ws protocoll: ["miid:event:msgid","err","data"]
            data[0] = data[0].split(':');
            
            // check if miid and event exists
            if (M.miids[data[0][0]] && M.miids[link.miid].listeners(data[0][1]).length === 0) {
            
                var message = M.miids[data[0][0]].clone();
                message.link = {
                    ws: ws,
                    event: data[0][1],
                    session: session
                };
            
                if (data[0][2]) {
                    message.link.id = data[0][2];
                }
                
                // emit event
                message.emit(message.link.event, data[1], data[2]);
                
            } else {
                // TODO send not found
                ws.send('404 Miid or event not found');
            }
        });
    });
});

// start listen and write app id to stdout
M.on('ready', function () {
    M.http.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
