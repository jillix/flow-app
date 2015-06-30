var parse = require('url').parse;
var defaultHeader = {'content-type': 'text/plain'};
var utils = require('./client/utils');

/**
 * Handle http requests.
 *
 * @public
 * @param {object} The session object.
 * @param {object} The http request object.
 * @param {object} The http response object.
 */
module.exports = function handler (req, res) {
    
    var url = parse(req.url, true);
    var session = req.session || {};

    // create path array
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
    
    // create http stream object
    var eventName;
    var instance;
    
    switch (path[0]) {
      
        // handle public file requests
        case engine.public_file_id:
            eventName = 'P';
            instance = engine;

            // remove public file identifier
            url.pathname = url.pathname.substr(2);

            break;
        
        // handle operation requests
        case engine.operation_id:
            
            // ceck if it's a valid operation url
            if (path.length < 2 || !path[1] || !path[2]) {
                res.writeHead(400, defaultHeader);
                res.end('Invalid operation url.');
                return;
            }
            
            // update pathname
            url.pathname = url.pathname.substr(5);
            
            // set engine core module as instance
            if (path[1] === engine.operation_id) {
    
                // set engine core module as instance
                instance = engine;
    
                // remove operation key and instance name from path
                path = path.slice(2);
    
                // handle external files that must be wrapped
                if (path[0] === engine.public_file_id) {
                    path = path.slice(1);
                    eventName = 'W';
    
                // set event name to the core opertation to fetch files
                } else {
                    eventName = 'F';
                }
    
            // get cached instance and check access
            } else {
    
                // remove operation key, module instance name and event from path
                path = path.slice(3);
                
                // get the event name
                eventName = path[2];
                
                // get instance
                if (!(instance = engine.instances[path[1]])) {
                    
                    // load an instance and setup stream
                    return engine.load(path[1], session[engine.session_role], function (err, instance) {
                        
                        if (err) {
                            res.writeHead(404, defaultHeader);
                            res.end(err.toString());
                            return;
                        }
                        
                        setupStream(instance, eventName, req, res, session, path, url);
                    });
                }
            }
            
            break;
        
        // send client on all other requests
        default:
            eventName = 'E';
            instance = engine;
    }
    
    
    // check event access
    if (!utils.eventAccess(instance, session[engine.session_role], eventName)) {

        // send a "not found" if instance is not found or access denied
        res.writeHead(404, defaultHeader);
        res.end('Operation not found.');
        return;
    }
    
    setupStream(instance, eventName, req, res, path, url);
};

function setupStream (instance, eventName, req, res, path, url) {
    
    // create an event stream
    var stream = instance.flow(eventName, {
        req: req,
        res: res,
        headers: {'content-type': 'text/plain'},
        session: req.session,
        path: path,
        pathname: url.pathname,
        query: url.query,
        _end: end,
        _write: send
    });
    
    // send request data to event stream 
    req.on('data', function (chunk) {
        stream.write(null, chunk);
    });
    
    // write error to event streams  
    req.on('error', function (error) {
        stream.write(error);
    });
    
    // resume request (emit data events)
    req.resume();
}

function send (err, data, stream) {
    
    data = convertToBuffer(data, stream.headers);

    // end stream on error
    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
        return stream.end(code, data);
    }

    stream.res.write(data);
}

/**
 * Send a http response (end the connection).
 *
 * @public
 * @param {number} The http status code.
 * @param {object} The response data.
 */
function end (code, data) {

    this.headers.Server = 'JCES';

    data = convertToBuffer(data, this.headers);

    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
    }

    this.headers['Content-Length'] = data.length;

    this.res.writeHead(code, this.headers);
    this.res.end(data);
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
