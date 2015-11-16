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

            var pos = -1;
            var runSeq = function (err, data) {

                if (err) {

                    // just push data to readable if error is true
                    if (data) {
                        return sequence.push(err);
                    }

                    // emit error
                    return next(err);
                };

                // get handler
                var handler = sequence.seq[++pos];
                if (!handler) {

                    // auto convert to non-object streams
                    if (!options.objectMode &&
                        typeof data !== 'string' &&
                        data.constructor !== Buffer
                    ) {
                        try {
                            data = JSON.stringify(data);
                        } catch (err)  {
                            return next(err);
                        }
                    }

                    return next(null, data);
                }

                // call next data handler
                handler[0].call(handler[2], runSeq, handler[1], data);
            };

            if (!sequence.seq) {
                sequence.once('sequence', runSeq.bind(this, null, chunk));
                return;
            }

            runSeq(null, chunk);
        }
    });
    
    return sequence;
};
