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

    // create path array
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);

    if (path[0] === engine.operation_id) {

        if (path.length < 3 || !path[1] || !path[2]) {
            return link.end(400, 'Invalid operation url.');
        }

        var instance;
        var role = session[engine.session_role];
        var link = {
            req: req,
            res: res,
            end: end
        };

        // set engine as instance (core module)
        if (path[1] === engine.operation_id) {

            // set engine core module as instance
            instance = engine;

            // remove operation key and instance name from path
            link.path = path.slice(2);

            // set event name to the core opertation to fetch files
            link.name = 'file';

        // get cached instance and check access
        } else {

            if (!(instance = engine.module.eventAccess(role, path[1], path[2]))) {

                // send a "not found" if instance is not found or access denied
                return link.end(404, 'Instance or operation not found.');
            };

            // remove operation key, module instance name and event from path
            link.path = path.slice(3);

            // get the event name
            link.name = path[2];
        }

        // extend link object
        link._ = instance;

        // save session object on link
        link.session = session;

        // add the pathname to the link
        link.pathname = url.pathname;

        // append the parsed query object to the link
        link.query = url.query;

        // set a empty response header object
        link.haeders = {};

        // save core session data shortcuts (role, userId, locale)
        link[engine.session_role] = role;
        link[engine.session_user] = session[engine.session_user];
        link[engine.session_locale] = session[engine.session_locale];

        // emit operation
        instance.emit(link.name, link);

        // resume request
        return req.resume();
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
