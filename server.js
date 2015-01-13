require('./lib/server/config');
var env = process.env;
var http = require('http');
var WebSocketServer = require('ws').Server;
var parse = require('url').parse;
var clone = require(env.Z_PATH_UTILS + 'object').clone;
var route = require(env.Z_PATH_SERVER + 'router');
var send = require(env.Z_PATH_SERVER + 'send');
var middleware = require(env.Z_PATH_MIDDLEWARE + 'session');
var cache = require(env.Z_PATH_CACHE + 'cache');

// create instance cache with role check
var instanceCache = cache.pojo('instances', true);

// init and cache core module instance
require(env.Z_PATH_MODULE + 'module');

// start http server
var httpServer = http.createServer(middleware(requestHandler));

// start ws server
var ws = new WebSocketServer({server: httpServer});

// pass websocket to send module
send.setWebsocket(ws);

// listen to ws connections
ws.on('connection', middleware(connectionHandler));

// start http server
httpServer.listen(env.Z_PORT);

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
function requestHandler (err, session, req, res) {

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
        var role = session[env.Z_SESSION_ROLE_KEY];
        var instance = checkOperationAccess(role, path[1], path[2]);

        // check if instance an operation exists
        if (instance) {

            // create event object
            var event = {
                _: instance,
                req: req,
                res: res,
                path: path.slice(3),
                query: url.query,
                pathname: url.pathname,
                name: path[2],
                send: send.link,
                session: session
            };

            // save session in link
            event[env.Z_SESSION_ROLE_KEY] = role;
            event[env.Z_SESSION_USER_KEY] = session[env.Z_SESSION_USER_KEY];
            event[env.Z_SESSION_LOCALE_KEY] = session[env.Z_SESSION_LOCALE_KEY];

            // set a empty response header object
            event.headers = {};

            // emit operation
            instance.emit(event.name, event, req, function (code, data) {
                event.send(code, data);
            });

            // resume request
            req.resume();

        } else {
            return send.httpError(req, res, 404, new Error('Instance or operation not found.'));
        }

    } else {
        route(url.pathname, req, res);
        req.resume();
    }
}

function connectionHandler (err, session, ws) {

    if (err) {
        return send.wsError(ws, err);
    }

    // listen to messages
    ws.on('message', function (data) {

        // parse data
        // protocoll: ["instanceName:event:msgid","data"]
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
        var role = session[env.Z_SESSION_ROLE_KEY];
        var instance = checkOperationAccess(role, data[0][0], data[0][1]);

        // check if instance and event exists
        if (instance) {

            // create event object
            var event = {
                _: instance,
                ws: ws,
                name: data[0][1],
                send: send.message,
                id: data[0][2],
                session: session
            };

            // save session in event
            event[env.Z_SESSION_ROLE_KEY] = role;
            event[env.Z_SESSION_USER_KEY] = session[env.Z_SESSION_USER_KEY];
            event[env.Z_SESSION_LOCALE_KEY] = session[env.Z_SESSION_LOCALE_KEY];

            // emit event
            instance.emit(event.name, event, data[1], function (err, data) {

                // TODO implement loging
                if (err) {
                    console.log(instance._name, 'event:', event.name, 'error:', err);
                }

                event.send(err, data);
            });

        } else {
            send.wsError(ws, new Error('Instance or event not found'), data[0][2]);
        }
    });
}
