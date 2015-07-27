var utils = require('./utils');

// Event stream factory
module.exports = function factory (instance, inputStream) {

    // create stream object
    var stream = utils.clone(Stream);
    stream._ = instance;
    stream._d = [];
    stream._o = [];
    stream._b = [];
    stream._e = [];
    stream.context = {};

    if (inputStream) {

        // pass context
        if (inputStream.context) {
            stream.context = inputStream.context;
        }

        stream._i = inputStream;
        stream._ii = inputStream._o.length;
        inputStream._o.push(stream);
    }

    return stream;
};

function dataArgs (scope, args) {
    args = [].slice.call(args);
    var method = args.splice(0, 1)[0];

    if (method instanceof Array) {
        scope = method[0];
        method = method[1];
    }
    
    return [scope, method, args];
}

/**
 * Stream like events.
 *
 * @class Stream
 */
var Stream = {

    // handler for incoming data
    data: function (method) {
        this._d.push(dataArgs(this._, arguments));
        return this;
    },
    
    // handler for incoming data
    error: function (method) {
        this._e.push(dataArgs(this._, arguments));
        return this;
    },

    // send data
    write: function (err, data) {

        // buffer data in paused mode
        if (this._p) {
            this._b.push([this.write, arguments]);
            return this;
        }

        // call handlers on output streams
        if (this._o.length) {
            for (var i = 0, l = this._o.length; i < l; ++i) {
                this._o[i].emit(err, data);
            }
        }

        if (this._i) {
            this._i.emit(err, data, this._ii);
        }

        return this;
    },
    
    emit: function (err, data, ignore) {

        // buffer data in paused mode
        if (this._p) {
            this._b.push([this.emit, arguments]);
            return this;
        }

        var i, l, method, args;
        var handlers = err ? this._e : this._d;
        var argData = err || data;

        // call data handlers with err and data as arguments
        for (i = 0, l = handlers.length; i < l; ++i) {

            // call data handler with stream instance as function scope
            // and overwrite data with transformed dataq
            argData = handlers[i][1].apply(handlers[i][0], [argData, this].concat(handlers[i][2])) || argData;
        }

        // call handlers on output streams
        if (!this._broken && this._o.length) {
            for (i = 0, l = this._o.length; i < l; ++i) {
                if (ignore !== i) {
                    this._o[i].emit(err, data, this._ii);
                }
            }
        }
    },

    end: function () {

        // remove refs
        this._o = [];
        this._b = [];
        this._d = [];
        this._e = [];

        // call custom end handler
        if (typeof this._end === 'function') {
            this._end.apply(this, arguments);
        }
        
        // remove stream from input's outputs
        if (this._i) {
            this._i.end.apply(this._i, arguments);
        }
        
        this._ = this._i = null;

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
                this._b[i][0].apply(this, this._b[i][1]);
            }
        }

        return this;
    }
};
