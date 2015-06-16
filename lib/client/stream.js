var utils = require('./utils');

// Event stream factory
module.exports = function factory (instance, context) {
    
    // create stream object
    var stream = utils.clone(Stream);
    stream._ = instance;
    stream._h = [];
    stream._o = [];
    stream._i = [];
    
    // merge context into steam
    if (context) {
        for (var prop in context) {
            stream[prop] = context[prop];
        }
    }
    
    return stream;
};

/**
 * Stream like events.
 *
 * @class Stream
 */
var Stream = {
  
    // handler for incoming data
    data: function (handler, options) {
        this._h.push([handler, options]);
        return this;
    },
    
    // send data
    write: function (err, data) {
        
        // call handlers on output streams
        for (var o = 0, ol = this._o.length, stream, handlers; o < ol; ++o) {
          
            // get ouputs input handlers
            stream = this._o[o];
            handlers = stream._h;
            
            // call data handlers with err and data as arguments
            for (var i = 0, l = handlers.length; i < l; ++i) {
              
                //call data handler with stream instance as function scope
                var newData = handlers[i][0].call(stream, err, data, handlers[i][1]);
                
                // overwrite data with transformed data
                if (newData !== undefined) {
                    data = newData;
                }
            }
        }
        
        // call custom write handler
        if (typeof this._write === 'function') {
            this._write(err, data);
        }
        
        return this;
    },
    
    end: function () {
        
        // remove from output streams
        for (var i = 0, l = this._i.length; i < l; ++i) {
            this._i[i][0]._o.splice(this._i[i][1], 1);

            // end input stream if all outputs ended
            if (!this._i[i][0]._o.length) {
                this._i[i][0].end();
            }
        }
        
        // remove refs
        this._ = this._i = this._o = undefined;
        
        // call custom end handler
        if (typeof this._end === 'function') {
            this._end.apply(this, arguments);
        }
    },
    
    // pipe data to an stream
    pipe: function (stream) {
        
        // save input stream and output index on output stream
        stream._i.push([this, this._o.length]);
        
        // push output stream
        this._o.push(stream);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return stream;
    }
};
