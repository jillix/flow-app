// TODO create a real stream!

var parse = require('url').parse;
var utils = require('./client/utils');

module.exports = function (session, req, res) {
    
    var url = parse(req.url, true);

    // create path array
    var path = url.pathname.replace(/\/$|^\//g, "").split("/", 42);
  
    // ..parse http request and create or get stream
    var stream = utils.clone(HttpStream);
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
};

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
            out = this._o[o];
            
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
        this._o.push(eventStream._i);
        
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
