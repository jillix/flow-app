/*

TODO check the pending not 200 requests (seen with node-static, but check also http operation requests) 

*/
require('./api');
var M = process.mono;
var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var route = require(M.config.paths.SERVER_ROOT + 'router');
var send = require(M.config.paths.SERVER_ROOT + 'send');

// check event access and if event and miid exists
// TODO must here the role also be checked?? 
function getCachedMiid (miid, event) {
    
    miid = M.cache.miids.get(miid);
    
    if (miid && miid.listeners(event).length > 0) {
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
            return send.httpError(req, res, 400, new Error('Invalid operation url.'));
        }
        
        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            return send.httpError(req, res, 400, new Error('Missing module instance ID or operation name.'));
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
            
            // emit operation
            operation.emit(path[2]);
            req.resume();
            
        } else {
            return send.httpError(req, res, 404, new Error('Miid or operation not found.'));
        }
        
    } else {
        route(url.pathname, req, res);
        req.resume();
    }
}

function connectionHandler (ws) {
    
    // listen to messages
    ws.on('message', function (data) {
        
        // parse data
        try {
            data = JSON.parse(data.toString());
            data[0] = data[0].split(':');
            
            // check message integrity
            if (!data[0][0] || !data[0][1]) {
                throw new Error('Bad message');
            }
        } catch (err) {
            return send.wsError(ws, err);
        }
        
        // get miid from cache and check access
        var miid = getCachedMiid(data[0][0], data[0][1]);
        // id for message callbacks
        var cbId = data[0][2];
        
        // check if miid and event exists
        if (miid) {
            // mono ws protocoll: ["miid:event:msgid","err","data"]
            var message = miid.clone();
            message.link = {
                ws: ws,
                event: data[0][1],
                miid: data[0][0],
                send: send.message,
                id: cbId
            };
            
            // emit event
            message.emit(message.link.event, data[1], data[2]);
            
        } else {
            send.wsError(ws, new Error('Miid or event not found'), cbId);
        }
    });
}

// start http server
M.http = http.createServer(function (req, res) {
    
    // plug http middleware functionality
    if (M.listeners('request').length) {
        M.emit('request', req, res, function () {
            requestHandler(req, res);
        });
    } else {
        
        // add public role to request
        req.session = {};
        req.session[M.config.session.role] = M.config.session.publicRole;
        
        // handle http request
        requestHandler(req, res);
    }
    
});

// start ws server
M.ws = new WebSocketServer({server: M.http});
M.ws.on('connection', function(ws) {
    
    // plug ws middleware functionality
    if (M.listeners('connection').length) {
        M.emit('connection', ws, function () {
            connectionHandler(ws);
        });
    } else {
        
        // add public role to websocket
        ws.session = {};
        ws.session[M.config.session.role] = M.config.session.publicRole;
        
        // handle ws connection
        connectionHandler(ws);
    }
});

// start listen and write app id to stdout
M.on('ready', function () {
    M.http.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
