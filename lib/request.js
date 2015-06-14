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
    
    /*
    
    - create local stream (instance)
    - pipe request data req.on('data', stream.write);
    - emit local stream
    
    */
    
    // create http stream object
    var stream = HttpStream(session, req, res);
    var eventName;
    var instance;
    
    switch (stream.path[0]) {
        
        // handle operation requests
        case engine.operation_id:
            
            // ceck if it's a valid operation url
            if (stream.path.length < 2 || !stream.path[1] || !stream.path[2]) {
                return stream.end(400, 'Invalid operation url.');
            }
            
            // set engine core module as instance
            if (stream.path[1] === engine.operation_id) {
    
                // set engine core module as instance
                instance = engine;
    
                // remove operation key and instance name from path
                stream.path = stream.path.slice(2);
    
                // handle external files that must be wrapped
                if (stream.path[0] === engine.public_file_id) {
                    stream.path = stream.path.slice(1);
                    eventName = 'extFile';
    
                // set event name to the core opertation to fetch files
                } else {
                    eventName = 'file';
                }
    
            // get cached instance and check access
            } else {
    
                // remove operation key, module instance name and event from path
                stream.path = stream.path.slice(3);
                
                // get cached instance
                instance = instance_cache.get(stream.path[1]);
                
                if (!instance) {
                    // TODO load instance!
                }
                
                // get the event name
                eventName = stream.path[2];
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
    if (!Instance.eventAccess(instance, stream[engine.session_role], eventName)) {

        // send a "not found" if instance is not found or access denied
        return stream.end(404, 'Instance or operation not found.');
    }
    
    // emit stream
    instance.emit(eventName, stream);
    
    // resume request (emit data events)
    req.resume();
};

function HttpStream (session, req, res) {
    
    var url = parse(req.url, true);

    // create path array
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
  
    // ..parse http request and create or get stream
    var stream = utils.clone(Stream);
    stream.req = req;
    stream.res = res;
    
    // set a empty response header object
    stream.haeders = {};
    
    // save session object on stream
    stream.session = session;
    
    // save path array on the stream
    stream.path = path;

    // add the pathname to the stream
    stream.pathname = url.pathname;

    // append the parsed query object to the stream
    stream.query = url.query;

    // save core session data shortcuts (role, userId, locale)
    stream[engine.session_role] = session[engine.session_role];
    stream[engine.session_user] = session[engine.session_user];
    stream[engine.session_locale] = session[engine.session_locale];
    
    return stream;
}

var HttpStream = {
    
    // handler for incoming data
    data: function (handler, options) {
        this._i.push([handler, options]);
        return this;
    },
    
    // send data
    write: function (err, data) {
        
        // write to out streams
        for (var o = 0, ol = this._o.length, out; o < ol; ++o) {
          
            // get ouputs input handlers
            out = this._o[o]._i;
            
            // call data handlers with err and data as arguments
            for (var i = 0, l = out.length; i < l; ++i) {
              
                //call data handler with eventStream instance as function scope
                var newData = out[i][0].call(this._, err, data, out[i][1]);
                
                // overwrite data with transformed data
                if (newData !== undefined) {
                    data = newData;
                }
            }
        }
        
        // end stream by sending null
        if (data === null) {
            this.end();
        }
        
        return this;
    },
    
    end: function (code, data) {
        // remove refs
        this._ = this._i = this._o = undefined;
        
        end.call(this, code, data);
    },
    
    // pipe data to an event stream
    pipe: function (eventStream) {
        
        // append out streams
        this._o.push(eventStream);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return eventStream;
    }
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

