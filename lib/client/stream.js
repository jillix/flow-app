var utils = require('./utils');

// Duplex stream factory
exports.Duplex = Duplex;
exports.Readable = Readable;
exports.Writable = Writable;

function Duplex (instance, readable, writable) {
    
    // get or create read- and writable streams
    readable = readable || Readable(instance);
    writable = writable || Writable(instance);
    
    // setup duplex streams
    readable.pipe(writable).pipe(readable);
    
    // create dublex stream object
    /*
    var writeMethods = ["write", "end", "destroy"]
    var readMethods = ["resume", "pause"]
    var readEvents = ["data", "close"]
    */
    var stream = {
        write: writable.write,
        end: writable.end,
        destroy: writable.destroy,
        resume: readable.resume,
        pause: readable.pause
    };
    stream._ = instance;
    stream._i = [];
    stream._o = [];
    
    return stream;
}

// Readable stream factory
function Readable (instance) {
    
    // create stream object
    var stream = utils.clone(ReadStream);
    stream._ = instance;
    stream._i = [];
    stream._o = [];
    
    return stream;
}

// Writable stream factory
function Writable (instance) {
    
    // create stream object
    var stream = utils.clone(WriteStream);
    stream._ = instance;
    stream._i = [];
    stream._o = [];
    
    return stream;
}

/**
 * Stream like events.
 *
 * @class Stream
 */
var ReadStream = {
    
    // handler for incoming data
    data: function (handler, options) {
        this._i.push([handler, options]);
        return this;
    },
    
    resume: function () {},
    pause: function () {},
    
    // pipe data to an stream
    pipe: function (writable) {
        
        // append writable stream
        this._w.push(writable);
        
        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return writable;
    },
    
    // TODO events
    // "data", "close"
    on: function () {},
    once: function () {},
    emit: function () {}
};
/**
 * Stream like events.
 *
 * @class Stream
 */
var WriteStream = {
    
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
    },
    
    // TODO events
    on: function () {},
    once: function () {},
    emit: function () {}
};
