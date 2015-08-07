var utils = require('./utils');
var streams = {};

engine._r.push(function () {
    streams = {};
});

// Event stream factory
module.exports = function factory (instance, inputStream, cache) {

    if (cache) {
        cache = instance._name + cache;
        
        if (streams[cache]) {
            return [streams[cache]];
        }
    }
    
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
    
    if (cache) {
        stream._cache = cache;
        streams[cache] = stream;
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
        var self = this;

        // buffer data in paused mode
        if (self._p) {
            self._b.push([self.write, arguments]);
            return self;
        }

        // call handlers on output streams
        if (self._o.length) {
            for (var i = 0, l = self._o.length; i < l; ++i) {
                self._o[i].emit(err, data);
            }
        }

        if (self._i) {
            self._i.emit(err, data, self._ii);
        }

        return self;
    },

    emit: function (err, data, ignore) {
        var self = this;

        // buffer data in paused mode
        if (self._p) {
            self._b.push([self.emit, arguments]);
            return self;
        }

        var i, l, method, args;
        var handlers = err ? self._e : self._d;
        var argData = err || data;
        var returnValue;

        // call data handlers with err and data as arguments
        for (i = 0, l = handlers.length; i < l; ++i) {

            // call data handler with stream instance as function scope
            // and overwrite data with transformed dataq
            returnValue = handlers[i][1].apply(handlers[i][0], [argData, self].concat(handlers[i][2]));

            if (returnValue === null) {
                break;
            }

            argData = returnValue || argData;
        }

        // call handlers on output streams
        if (!self._broken && self._o.length) {
            for (i = 0, l = self._o.length; i < l; ++i) {
                if (ignore !== i) {
                    self._o[i].emit(err, data, self._ii);
                }
            }
        }
    },

    end: function () {
        var self = this;

        // remove refs
        self._b = [];
        self._d = [];
        self._e = [];

        // call custom end handler
        if (typeof self._end === 'function') {
            self._end.apply(self, arguments);
        }

        self._ended = true;

        // end connected streams in next event loop
        utils.nextTick(function (stream, args) {

            // remove stream from input's outputs
            if (stream._i) {
                stream._i.end.apply(stream._i, args);
            }
    
            if (stream._o.length) {
                for (var i = 0; i < stream._o.length; i++) {
                    if (!stream._o[i]._ended) {
                      stream._o[i].end.apply(stream._o[i], args);
                    }
                }
            }

            delete streams[stream._cache];
     
            stream._ = stream._i = null;
            stream._o = [];

        }, self, arguments);

        return self;
    },

    // buffer writes
    pause: function () {

        // enable pause mode
        this._p = true;

        return this;
    },

    // write bufferd data
    resume: function () {
        var self = this;

        // disable pause mode
        self._p = false;

        // write bufferd data
        if (self._b.length) {
            for (var i = 0, l = self._b.length; i < l; ++i) {
                self._b[i][0].apply(self, self._b[i][1]);
            }
        }

        return self;
    }
};
