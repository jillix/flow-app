var Stream = require('stream');

// writable
exports.Event = function (options) {
   
    // TODO set local stream to object mode
    // TODO net streams default mode
 
    var stdout = options.std;
    var stderr = options.err;
    stdout = stdout || {
        write: function () {},
        end: function () {}
    };

    // write errors to stdout if stderr dont exists
    stderr = stderr || stdout;

    var stdin = Stream.Duplex({
        readableObjectMode: true,
        writableObjectMode: true
    });
    stdin._buf = [];
    stdin._write = function (chunk, enc, next) {
        
        if (!stdin._fe) {
            return stdin.out.end(new Error('No handlers for event.'));
        }

        stdin.next = next;
        stdin._pos = -1;
        stdin.out.next(null, chunk);
    };
    stdin._read = function () {
        if (stdin._fe) {
            stdin.uncork();
        }
    },
    stdin.stdout = stdout;
    stdin.stderr = stderr;
    stdin.out = {
        write: function (err, data) {

            if (typeof err !== 'undefined') {
                if (options.net !== 'flow') {
                    err = typeof err !== 'string' ? err.toString() : err;
                }
                return stdin.stderr.write(err);
            }

            if (typeof data !== 'undefined') {

                if (options.net !== 'flow' && typeof data !== 'string' && data.constructor !== Buffer) {
                    data = JSON.stringify(data);
                }
                
                stdin.stdout.write(data);
            }

        },
        end: function (err, data) {
            
            stdin.out.write(err, data);
            stdin.stdout.end();
            stdin.stderr.end();

            // TODO what to do on event stream end?
            stdin.push(null);
            stdin.end();
        },
        next: function (err, data) {

            // emit error to event stream: this.flow(...).on('error', fn);
            if (err) {
                // TODO call error handlers
                
                stdin.next(err);
                data = null;
            }

            // handle EOF
            // TODO test stream piping/unpigin, what happens on EOF?
            if (data === null) {
                // end input and output streams
                stdin.out.end();
                return;
            }

            // update handler ref
            var dh = stdin._fe.d[++stdin._pos];

            if (!dh) {

                // push data to readable
                if ((!stdin.push(data))) {
                    // buffer all writes
                    stdin.cork()
                }

                // request the next data chunk
                stdin.next();

                return;
            }

            // call next data handler
            dh[1].call(dh[0], stdin.out, dh[2], data);
        }
    };

    return stdin;
};
