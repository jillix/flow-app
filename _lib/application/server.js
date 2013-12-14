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

// check event access and if event and miid exists
function getCachedMiid (miid, event) {
    
    miid = M.cache.miids.get(miid);
    
    if (miid && miid.mono.access[event] && miid.listeners(event).length > 0) {
        return miid;
    }
    return null;
}

// handle http request
function requestHandler (req, res) {
    
    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    
    if (path[0] == M.config.coreKey) {
    
        if (path.length < 3) {
            // TODO send error
            return send.server(req, res, 400, 'Invalid operation url.');
        }
        
        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            // TODO send error
            return send.server(req, res, 400, 'Missing module instance ID or operation name.');
        }
        
        // get cached miid and check access
        var miid = getCachedMiid(path[1], path[2]);
        
        // check if miid an operation exists
        if (miid) {
            var operation = miid.clone();
            operation.link = {
                req: req,
                res: res,
                path: path.slice(3),
                query: url.query,
                pathname: url.pathname,
                event: path[2],
                send: send.link
            };
            
            // set a empty response header object
            operation.link.res.headers = {};
            
            session.get(req.headers, function (session) {
                
                operation.link.session = session;
                
                // emit operation
                operation.emit(path[2]);
                req.resume();
            });
            
        } else {
            // TODO not found
            return send.server(req, res, 404, 'Miid or operation not found.');
        }
        
    } else {
        route(url.pathname, req, res);
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
            
            // get miid from cache and check access
            var miid = getCachedMiid(data[0][0], data[0][1]);
            
            // check if miid and event exists
            if (miid) {
            
                var message = miid.clone();
                message.link = {
                    ws: ws,
                    event: data[0][1],
                    miid: data[0][0],
                    session: session,
                    send: send.message
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
