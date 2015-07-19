var utils = require('./utils');

// Event stream factory
module.exports = function factory (instance, inputStream) {

    // create stream object
    var stream = utils.clone(Stream);
    stream._ = instance;
    stream._d = [];
    stream._o = [];
    stream._b = [];
    
    if (inputStream) {
        stream._i = inputStream;
        stream._ii = inputStream._o.length;
        inputStream._o.push(stream);
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
    data: function (method) {
        var args = [].slice.call(arguments);
        args.splice(0, 1);
        this._d.push([method, args]);
        return this;
    },

    // send data
    write: function (err, data) {

        // call custom write handler
        if (typeof this._write === 'function') {
            data = this._write(err, data, this) || data;
        }

        // call handlers on output streams
        if (this._o.length) {
            for (var i = 0, l = this._o.length; i < l; ++i) {
                this._o[i].emit(err, data);
            }
        }
        
        // emit data on input handler (back stream)
        if (this._i && !this._i._ext) {
            this._i.emit(err, data, this._ii);
        }

        return this;
    },
    
    emit: function (err, data, ignore) {
        
        // buffer data in paused mode
        if (this._p) {
            this._b.push(arguments);
            return this;
        }
        
        var i, l, method, args;

        // call data handlers with err and data as arguments
        for (i = 0, l = this._d.length; i < l; ++i) {
            
            // call data handler with stream instance as function scope
            // and overwrite data with transformed data
            data = this._d[i][0].apply(this._, [err, data, this].concat(this._d[i][1])) || data;
        }

        // call handlers on output streams
        if (!this._ext && this._o.length) {
            for (i = 0, l = this._o.length; i < l; ++i) {
                if (ignore !== i) {
                    this._o[i].emit(err, data, this._ii);
                }
            }
        }
    },

    end: function () {

        // remove stream from input's outputs
        if (this._i) {
            this._i._o.splice(this._ii, 1);
        }

        // remove refs
        this._o = [];
        this._b = [];
        this._d = [];
        this._ = this._i = null;

        // call custom end handler
        if (typeof this._end === 'function') {
            this._end.apply(this, arguments);
        }

        return this;
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
                this.emit.apply(this, this._b[i]);
            }
        }

        return this;
    }
};
