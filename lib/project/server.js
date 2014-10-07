require('./config');
var env = process.env;
var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var clone = require(env.Z_PATH_UTILS + 'object').clone;
var route = require('./router');
var send = require('./send');
var middleware = require(env.Z_PATH_MIDDLEWARE + 'session');
var cache = require(env.Z_PATH_CACHE + 'cache');

var instanceCache = cache.pojo('instances');

// check if role has access to instance and operation
function checkOperationAccess (role, instance, event) {

    // get instance with role check
    instance = instanceCache.get(instance, role);

    // check if this instance has acces to the requested operation
    if (instance && instance._access[event]) {
        return instance;
    }

    return;
}

// handle http request
function requestHandler (err, req, res) {

    if (err) {
        return send.httpError(req, res, 500, err);
    }

    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);

    if (path[0] === env.Z_OP_KEY) {

        if (path.length < 3) {
            return send.httpError(req, res, 400, new Error('Invalid operation url.'));
        }

        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            return send.httpError(req, res, 400, new Error('Missing module instance ID or operation name.'));
        }

        // get cached instance and check access
        var role = req.session[env.Z_SESSION_ROLE_KEY];
        var instance = checkOperationAccess(role, path[1], path[2]);

        // check if instance an operation exists
        if (instance) {
            var operation = clone(instance);
            operation.link = {
                _: instance,
                req: req,
                res: res,
                path: path.slice(3),
                query: url.query,
                pathname: url.pathname,
                event: path[2],
                send: send.link,
                role: role
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

    if (err) {
        return send.wsError(ws, err);
    }

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
        var role = ws.session[env.Z_SESSION_ROLE_KEY];
        var instance = checkOperationAccess(role, data[0][0], data[0][1]);

        // id for message callbacks
        var cbId = data[0][2];

        // check if instance and event exists
        if (instance) {
            // mono ws protocoll: ["instanceName:event:msgid","err","data"]
            var message = clone(instance);
            message.link = {
                _: instance,
                ws: ws,
                event: data[0][1],
                send: send.message,
                id: cbId,
                role: role
            };

            // emit event
            message.emit(message.link.event, data[1], data[2]);

        } else {
            send.wsError(ws, new Error('Instance or event not found'), cbId);
        }
    });
}

// setup middleware
middleware(function (err, mware) {

    // terminate process on error
    if (err) {
        throw new Error(err);
    }

    // init and cache core module instance
    require(env.Z_PATH_MODULE + 'module')();

    // start http server
    var httpServer = http.createServer(mware(requestHandler));

    // start ws server
    var ws = new WebSocketServer({server: httpServer});

    // pass websocket to send module
    send.setWebsocket(ws);

    // listen to ws connections
    ws.on('connection',  mware(connectionHandler));

    // start http server
    httpServer.listen(env.Z_PORT);
});
