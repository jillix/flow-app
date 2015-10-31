var Stream = require('stream');

// writable
exports.Event = function (stdin) {

    // pipe a handler stream into a source readable stream
    // http request:
    /*
        // call data handlers on data chunk 
        req.on('data', handlerStream.write);

        // write to writable response stream
        stream.write(err, data);
        res.write(chunk);
        // (maybe just pass along the res stream?)

    */

    // ws request:
    /*
        // call data handlers on data chunk 
        ws.on('data', handlerStream.write);

        // write to writable response stream
        stream.write(err, data);
        ws.write(chunk);
        // (maybe just pass along the ws stream?)

    */

    // flow request:
    /*
        // call data handlers on data chunk 
        flow.on('data', handlerStream.write);

        // write to writable response stream
        stream.write(err, data);
        flow.write(chunk);
        // (maybe just pass along the flow stream?)

    */

    // pipe a writable stream
    // source readable (tcp, sensors)
    // source readable in code on('data')
    // writable data in code stream.write(null, data);
    // writable error in code stream.write(err)

    var stdout = Stream.Writable(); // handler stream
    var stderr = Stream.Writable(); // handler stream
    stdin.pipe(stdout);
    stdin.pipe(stderr);

    stdin.on('data', function (chunk) {
        //call data handlers
    })

    stdin.on('error', function (chunk) {
        //call error handlers
    })

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
