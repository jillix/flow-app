var Stream = require('stream');

// writable
exports.Event = function (options) {
   
    options = options || {};
    if (typeof options.objectMode === 'undefined') {
        options.objectMode = true;
    }
 
    var sequence = Stream.Duplex({
        readableObjectMode: options.objectMode ? true : false,
        writableObjectMode: options.objectMode ? true : false
    });

    // writable
    sequence._write = function (chunk, enc, next) {

        if (!sequence.seq) {
            return sequence.emit('error', new Error('Stream._write: Sequence not set.')); 
        }

        sequence._next = next;
        sequence._pos = -1;
        sequence.next(null, chunk);
    };

    // readable
    sequence._read = function () {
        if (sequence.seq) {
            sequence.uncork();
        }
    };


    // next haninstancedler
    sequence.next = function (err, data) {

        // handle steam end (null) | (false, null)
        if (err === null && (data === null || data === undefined)) {
            sequence.end();
            return;
        }

        if (err) {
            return sequence._next(err);
        }

        // get handler
        var handler = sequence.seq[0][++sequence._pos];
        if (!handler) {

            // auto convert to non-object streams
            if (!options.objectMode &&
                typeof data !== 'string' &&
                data.constructor !== Buffer
            ) {
                try {
                    data = JSON.stringify(data);
                } catch (err)  {
                    sequence._next(err);
                    return;
                }
            }

            // write to linked stream
            if (sequence.linked) {

                // push also to response
                if (sequence.seq[1][0] === '|') {
                    //sequence.push(data);
                }

                // handle back pressure
                if (!sequence.linked.write(data)) {
                    sequence.linked.once('drain', sequence._next);
                    return;
                }
                
            // push data to readable
            } else {

                if ((!sequence.push(data))) {

                    // buffer all writes
                    sequence.cork()
                }
            }

            // request the next data chunk
            sequence._next();
            return;
        }

        // call next data handler
        handler[0].call(handler[2], sequence.next.bind(sequence), handler[1], data);
    };

    return sequence;
};
