var utils = require('./utils');

// event stream factory
module.exports = function localStream (module_instance) {
    
    // create event stream object
    var eventStream = utils.clone(EventStream);
    eventStream._ = module_instance;
    eventStream._i = [];
    eventStream._o = [];
    
    return eventStream;
};

/**
 * Stream like events.
 *
 * @class EventStream
 */
var EventStream = {
    
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
    
    end: function () {
        // remove refs
        this._ = this._i = this._o = undefined;
    },
    
    // pipe data to an event stream
    pipe: function (eventStream) {
        
        // append out streams
        this._o.push(eventStream._i);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return eventStream;
    }
};
