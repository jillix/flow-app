var Stream = require('stream');

// writable
exports.Event = function (stdout, stderr) {
   
    // TODO set local stream to object mode
    // TODO net streams default mode
 
    stdout = stdout || {
        write: function () {},
        end: function () {}
    };

    // write errors to stdout if stderr dont exists
    stderr = stderr || stdout;

    var stdin = Stream.Writable();
    stdin._buf = [];
    stdin._write = function (chunk, enc, next) {
        
        if (!this._fe) {
            return this.out.end(new Error('No stream handlers for event.'));
        }

        // call first data handler
        this._fe.dh[0][1].call(this._fe.dh[0][0], this.out, this._fe.dh[0][2], chunk);
    };
 
    stdin.stdout = stdout;
    stdin.stderr = stderr;
    stdin.out = {
        write: function (err, data) {
            if (err) {
                return stdin.stderr.write(err);
            }

            stdin.stdout.write(data);
        },
        end: function (err, data) {
            stdin.out.write(err, data);
            stdin.stdout.end();
            stdin.stderr.end();
        },
        next: function (err, data) {

            var event = stdin._fe;
            pos = pos || 0;

            // update handler ref
            var dh = this.dh[++pos];

            if (dh) {
                // request next data chunk
            }

            if (data === null) {
                // end streamm
            }

            if (err) {
                // emit an error (call error handlers)
            }
        }
    };

    return stdin;
};
