var parse = require('url').parse;
var route = require('./static');
var defaultHeader = {'content-type': 'text/plain'};

/**
 * Handle http requests.
 *
 * @public
 * @param {object} The session object.
 * @param {object} The http request object.
 * @param {object} The http response object.
 */
module.exports = function handler (session, req, res) {

    var url = parse(req.url, true);
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);

    if (path[0] === engine.operation_identifier) {

        // create the event object
        var event = {
            req: req,
            res: res,
            send: send,
            session: session,
            pathname: url.pathname,
            path: path.slice(3),
            query: url.query
        };

        if (path.length < 3 || !path[1] || !path[2]) {
            return event.send(400, 'Invalid operation url.');
        }

        // get cached instance and check access
        var role = session[engine.session_role];
        var instance = engine.module.checkAccess(role, path[1], path[2]);

        // check if instance an operation exists
        if (instance) {

            // extend event object
            event._ = instance;
            event.path = path.slice(3);
            event.name = path[2];

            // save session in link
            event[engine.session_role] = role;
            event[engine.session_user] = session[engine.session_user];
            event[engine.session_locale] = session[engine.session_locale];

            // set a empty response header object
            event.headers = {};

            // emit operation
            instance.emit(event.name, event, req, function (code, data) {
                event.send(code, data);
            });

            // resume request
            return req.resume();

        }

        // send a "not found" if instance is not found or access denied
        return event.send(400, 'Instance or operation not found.');

    }

    // pass request to the static module
    route(url.pathname, req, res);
    req.resume();
};

/**
 * Send a http response.
 *
 * @public
 * @param {number} The http status code.
 * @param {object} The response data.
 */
function send (code, data) {
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

/**
 * Convert data to a data buffer.
 *
 * @private
 * @param {object} The data to convert.
 * @param {object} The http headers.
 */
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
