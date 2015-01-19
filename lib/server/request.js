var env = process.env;
var parse = require('url').parse;
var route = require(env.Z_PATH_SERVER + 'file');
var cache = require(env.Z_PATH_CACHE + 'cache');

var defaultHeader = {'content-type': 'text/plain'};

// create instance cache with role check
var instanceCache = cache.pojo('instances', true);

module.exports = requestHandler;

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
        return httpError(req, res, 500, err);
    }

    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);

    if (path[0] === env.Z_OP_KEY) {

        if (path.length < 3) {
            return httpError(req, res, 400, new Error('Invalid operation url.'));
        }

        // if no operation was found in the request URL
        if (!path[1] || !path[2]) {
            return httpError(req, res, 400, new Error('Missing module instance ID or operation name.'));
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
                send: link,
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
            return httpError(req, res, 404, new Error('Instance or operation not found.'));
        }

    } else {
        route(url.pathname, req, res);
        req.resume();
    }
}

// send server http errors
function httpError (req, res, code, err) {

    err = err.message || err;

    req.resume();
    res.statusCode = code;
    res.end(convertToBuffer(err));
}

// request response for operations
function link (code, data) {
    var self = this;

    var headers = self.headers || defaultHeader;
    headers.Server = 'JCES';

    data = convertToBuffer(data, headers);

    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
    }

    headers['Content-Length'] = data.length;

    self.res.writeHead(code, headers);
    self.res.end(data);
}

function convertToBuffer (data, headers) {

    if (data === undefined) {
        return new Buffer(0);
    }

    if (typeof data === 'string') {
        return new Buffer(data);
    }

    if (data instanceof Buffer) {
        return data;
    }

    try {
        data = JSON.stringify(data);

        if (headers) {
            headers['content-type'] = 'application/json; charset=utf-8';
        }
    } catch (err) {
        if (headers) {
            headers['content-type'] = 'text/plain';
        }
        return false;
    }

    if (data === undefined) {
        return false;
    }

    return new Buffer(data);
}
