var parse = require('url').parse;
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

    // clean up pathname
    url.pathname = url.pathname.replace(/\%7C/g, '|');

    // create path array
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);

    if (path[0] === engine.operation_id) {

        // create the link object
        var link = {
            req: req,
            res: res,
            end: end,
            session: session,
            pathname: url.pathname,
            path: path.slice(3),
            query: url.query
        };

        if (path.length < 3 || !path[1] || !path[2]) {
            return link.end(400, 'Invalid operation url.');
        }

        var instance;
        var role = session[engine.session_role];

        // set engine as instance (core module)
        if (path[1] === '0') {

            switch (path[2]) {
                case 'script':
                    instance = engine;
                    break;
            }

        // get cached instance and check access
        } else {
            instance = engine.module.access(role, path[1], path[2]);
        }

        // check if instance an operation exists
        if (instance) {

            // extend link object
            link._ = instance;
            link.path = path.slice(3);
            link.name = path[2];

            // save session in link
            link[engine.session_role] = role;
            link[engine.session_user] = session[engine.session_user];
            link[engine.session_locale] = session[engine.session_locale];

            // set a empty response header object
            link.headers = {};

            // emit operation
            instance.emit(link.name, link);

            // resume request
            return req.resume();
        }

        // send a "not found" if instance is not found or access denied
        return link.end(404, 'Instance or operation not found.');

    }

    // pass request to the static module
    engine.static(url.pathname, req, res);
    req.resume();
};

/**
 * Send a http response (end the connection).
 *
 * @public
 * @param {number} The http status code.
 * @param {object} The response data.
 */
function end (code, data) {
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
