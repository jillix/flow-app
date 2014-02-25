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

// check if instance exists and event access 
// TODO must here the role also be checked?? only if one instance has per role a config
function getCachedInstance (instance, event) {
    
    instance = M.cache.instances.get(instance);
    
    if (instance && instance.mono.access[event]) {
        return instance;
    }
    return null;
}

// handle http request
function requestHandler (err, req, res) {

    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    
    if (path[0] == M.config.operationKey) {
    
        if (path.length < 3) {
            return send.httpError(req, res, 400, new Error('Invalid operation url.'));
        }
        
        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            return send.httpError(req, res, 400, new Error('Missing module instance ID or operation name.'));
        }
        
        // get cached instance and check access
        var instance = getCachedInstance(path[1], path[2]);
        
        // check if instance an operation exists
        if (instance) {
            var operation = instance.clone();
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
            return send.httpError(req, res, 404, new Error('Instance or operation not found.'));
        }
        
    } else {
        route(url.pathname, req, res);
        req.resume();
    }
}

function connectionHandler (err, ws) {
    
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
        
        // get instance from cache and check access
        var instance = getCachedInstance(data[0][0], data[0][1]);
        // id for message callbacks
        var cbId = data[0][2];
        
        // check if instance and event exists
        if (instance) {
            // mono ws protocoll: ["instanceName:event:msgid","err","data"]
            var message = instance.clone();
            message.link = {
                mono: message.mono,
                ws: ws,
                event: data[0][1],
                send: send.message,
                id: cbId
            };
            
            // emit event
            message.emit(message.link.event, data[1], data[2]);
            
        } else {
            send.wsError(ws, new Error('Instance or event not found'), cbId);
        }
    });
}

// start http server
M.http = http.createServer(M.session(requestHandler));

// start ws server
M.ws = new WebSocketServer({server: M.http});
M.ws.on('connection',  M.session(connectionHandler));

// start listen and write app id to stdout
M.on('ready', function () {
    M.http.listen(M.config.port, M.config.host, function () {
        process.stdout.write(M.config.id);
    });
});
