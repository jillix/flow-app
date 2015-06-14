var utils = require('./utils');

// Stream factory
module.exports = function factory (module_instance) {
    
    // create stream object
    var stream = utils.clone(Stream);
    stream._ = module_instance;
    stream._i = [];
    stream._o = [];
    
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
              
                //call data handler with stream instance as function scope
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
    
    end: function () {
        // remove refs
        this._ = this._i = this._o = undefined;
    },
    
    // pipe data to an stream
    pipe: function (stream) {
        
        // append out streams
        this._o.push(stream);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return stream;
    }
};
