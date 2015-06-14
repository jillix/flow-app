var parse = require('url').parse;
var defaultHeader = {'content-type': 'text/plain'};
var Instance = require('./instance');
var Stream = require('./client/stream');
var utils = require('./client/utils');

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
    
    // create http stream object
    var eventName;
    var instance;
    
    switch (path[0]) {
        
        // handle operation requests
        case engine.operation_id:
            
            // ceck if it's a valid operation url
            if (path.length < 2 || !path[1] || !path[2]) {
                return end(400, 'Invalid operation url.');
            }
            
            // set engine core module as instance
            if (path[1] === engine.operation_id) {
    
                // set engine core module as instance
                instance = engine;
    
                // remove operation key and instance name from path
                path = path.slice(2);
    
                // handle external files that must be wrapped
                if (path[0] === engine.public_file_id) {
                    path = path.slice(1);
                    eventName = 'extFile';
    
                // set event name to the core opertation to fetch files
                } else {
                    eventName = 'file';
                }
    
            // get cached instance and check access
            } else {
    
                // remove operation key, module instance name and event from path
                path = path.slice(3);
                
                // get cached instance
                instance = instance_cache.get(path[1]);
                
                if (!instance) {
                    // TODO load instance!
                }
                
                // get the event name
                eventName = path[2];
            }
            
            break;

        // handle public file requests
        case engine.public_file_id:
            eventName = 'public';
            instance = engine;
            break;
        
        // handle client requests
        default:
            eventName = 'client';
            instance = engine;
    }
    
    // check event access
    if (!Instance.eventAccess(instance, session[engine.session_role], eventName)) {

        // send a "not found" if instance is not found or access denied
        return end(404, 'Instance or operation not found.');
    }
    
    // create stream
    // ..if an id is sent, get stream from cache? 
    var stream = Stream(instance);
    var context = {
        req: req,
        res: res,
        headers: {},
        session: session,
        path: path,
        pathname: url.pathname,
        query: url.query
    };
    
    // ..append data send handler?
    stream.data(send);
    
    // ..overwrite end function?
    stream.end = end;
    
    // ..write request data to local stream?
    req.pipe(stream).pipe(req);
    //req.on('data', stream.write);
    
    // emit stream
    instance.emit(eventName, stream, context);
    
    // resume request (emit data events)
    req.resume();
};

function send (data) {
    var self = this;

    data = convertToBuffer(data, headers);

    // end stream on error
    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
        return end(code, data);
    }

    self.res.write(data);
}

/**
 * Send a http response (end the connection).
 *
 * @public
 * @param {number} The http status code.
 * @param {object} The response data.
 */
function end (code, headers, data) {
    var self = this;

    headers = headers || defaultHeader;
    headers.Server = 'JCES';

    data = convertToBuffer(data, headers);

    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
    }

    headers['Content-Length'] = data.length;

    self.res.writeHead(code, headers);
    self.res.end(data);
    
    // remove refs
    this._ = this._i = this._o = undefined;
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
