var Stream = require('stream');

// writable
exports.Event = function (options) {
   
    options = options || {};
    if (typeof options.objectMode === 'undefined') {
        options.objectMode = true;
    }
 
    var sequence = Stream.Transform({
        objectMode: options.objectMode ? true : false,
        transform: function (chunk, enc, next) {

            var push;
            var pos = -1;
            var handler;
            var runSeq = function (err, data) {

                if (err && data) {
                    data = err;
                    err = null;
                    push = true;
                } else {
                    push = false;
                }

                // emit error
                if (err) {
                    return next(err);
                };

                // just push data to readable if data and error is true
                if (push) {
                    return sequence.push(data);
                }

                // get handler
                if (!(handler = sequence.seq[++pos])) {
                    return next(null, data);
                }

                // call next data handler
                if (!handler[4]) {

                    // once handler
                    if (handler[3]) {
                        handler[4] = true;
                    }

                    handler[0].call(handler[2], handler[1], data, runSeq);
                } else {
                    runSeq(null, data);
                }
            };

            if (!sequence.seq) {
                sequence.once('sequence', runSeq.bind(this, null, chunk));
                return;
            }

            runSeq(null, chunk);
        }
    });
    sequence.resume();
    return sequence;
};
