var utils = require('./utils');

// Event stream factory
module.exports = function factory (instance, context, parentStream) {

    // create stream object
    var stream = utils.clone(Stream);
    stream._ = instance;
    stream._h = [];
    stream._o = [];
    stream._i = [];
    stream._b = [];
    stream._l = [];

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

    flow: function (event, context, stream) {
        stream._l.push(this);
        stream._.flow(event, context, stream);
    },

    // handler for incoming data
    data: function (handler, options) {
        this._h.push([handler, options]);
        return this;
    },

    // send data
    write: function (err, data, reverse) {

        // buffer data in paused mode
        if (this._p) {
            this._b.push([err, data]);
            return this;
        }

        // call custom write handler
        if (typeof this._write === 'function') {
            data = this._write(err, data, this) || data;
        }

        // call handlers on output streams
        for (var o = 0, ol = this._o.length, stream, handlers; o < ol; ++o) {

            // get ouputs input handlers
            this._o[o].push(err, data);
            /*
            handlers = stream._h;
            
            // call data handlers with err and data as arguments
            for (var i = 0, l = handlers.length; i < l; ++i) {

                // call data handler with stream instance as function scope
                // and overwrite data with transformed data
                data = handlers[i][0].call(stream._, err, data, stream, handlers[i][1]) || data;
            }
            */
        }
        
        return this;
    },
    
    push: function (err, data) {
      
        // call data handlers with err and data as arguments
        for (var i = 0, l = this._h.length; i < l; ++i) {
          
            // call data handler with stream instance as function scope
            // and overwrite data with transformed data
            data = this._h[i][0].call(this._, err, data, this, this._h[i][1]) || data;
        }
        
        if (this._l.length) {
            for (var i = 0, l = this._l.length; i < l; i++) {
                // ..call out handlers of linked streams
                this._l.push(err, data);
            }
        }

        return this;
    },

    end: function () {

        // remove from output streams
        for (var i = 0, l = this._i.length; i < l; ++i) {
            // end input stream if all outputs ended
            if (!this._i[i][0]._o.length) {
                this._i[i][0].end();
            } else {
                this._i[i][0]._o.splice(this._i[i][1], 1);
            }
        }

        // remove refs
        this._ = this._i = this._o = this._b = [];

        // call custom end handler
        if (typeof this._end === 'function') {
            this._end.apply(this, arguments);
        }

        return this;
    },

    // pipe data to an stream
    pipe: function (stream) {

        // save input stream and output index on output stream
        stream._i.push([this, this._o.length]);

        // push output stream
        this._o.push(stream);

        // return out stream for unix like piping (a.pipe(b).pipe(a))
        return stream;
    },

    // buffer writes
    pause: function () {

        // enable pause mode
        this._p = true;

        return this;
    },

    // write bufferd data
    resume: function () {

        // disable pause mode
        this._p = false;

        // write bufferd data
        if (this._b.length) {
            for (var i = 0, l = this._b.length; i < l; ++i) {
                this.write(this._b[i][0], this._b[i][1]);
            }
        }

        return this;
    }
};
