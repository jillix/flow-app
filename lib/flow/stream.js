var Stream = require('stream');

// writable
exports.Event = function () {

    var eStream = Stream.Duplex();

    eStream._read = function () {};
    eStream._write = function () {};

    return eStream;
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
