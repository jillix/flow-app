var Stream = require('stream');

// writable
exports.Event = function (stdout, stderr) {

    // write errors to stdout if stderr dont exists
    stderr = stderr || stdout;

    var stdin = Stream.Writable();
    var instance = {
        _name: 'instName',
        method: function (res, options, data) {
            console.log('Instance data handler:', data ? data.toString() : data);
            res.end('from event data handler');
        }
    };
    var flowEvent = {
        dh: [
            instance.method
        ],
        rh: [],
        eh: [],
        sh: [],
        ondata: function (chunk, enc, cb) {
            console.log('Event data:', chunk ? chunk.toString() : chunk);

            var write = function (err, data) {
                if (err) return stderr.write(err);
                stdout.write(data);

                // emit response data on the stdin stream
                // for in code usage.
                // this.flow(...).ondata = function (err, data));
                if (typeof stdin.ondata === 'function') {
                    stdin.ondata(err, data);
                }
            };
            var responde = {
                write: write,
                end: function (err, data) {
                    write(err, data);
                    stderr.end();
                    stdout.end();
                }
            };

            this.dh.forEach(function (handler) {
                handler.call(instance, responde, {}, chunk);
            });

            // TODO cb(error);
            cb();
        }
    };

    stdin._fe = flowEvent;
    stdin._write = function (chunk, enc, cb) {
        this._fe.ondata(chunk, enc, cb);
    };

    // connect a readable source with a handler stream
    // and pass the writable source to the handlers 

    // TODO local flow streams code usage
    // TODO how to link flow streams?
    // push results from handlers into readable stream
    // read this data from the linked readable stream
    return stdin;
};

// duplex
exports.Handler = function (flow) {

    // create event object with method refs
    // create data\error\end handlers for streams
    var hStream = Stream.Writable();
    hStream.sh = flow.sh;
    hStream.dh = flow.dh;
    hStream.rh = flow.rh;
    hStream.eh = flow.eh;
    hStream.event = function () {
        // call stream handlers
    };

    hStream._write = function (chunk, enc, next) {

        // TODO handle request streams in flow
        //if (hStream.req) {
            // collect all chunks
            // and concat and return data on end
            // use callback as end handler
        //}
        // check if it's an error
        // - call error handlers
        // call all data handlers
    };

    // call all end handlers
    hStream.on('finish', function () {

        // call all end handlers
    });

    /*
    var dh;
    var pos = -1;
    var next = function (err, data) {

        // update handler ref
        dh = this.dh[++pos];

        if (!dh || data === null) {
            // end stream
        }

        if (err) {
            // emit an error (call error handlers)
        }

        dh[1].call(dh[0], stream, dh[2], data, next);
    };

    return function (data) {
        next(null, data);
    };
    */

    console.log(hStream);
    return hStream;
};
