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
    stdin.stdout = stdout;
    stdin.stderr = stderr;
    stdin._buf = [];
    stdin._write = function (chunk, enc, cb) {
        stdin._buf.push([chunk, enc, cb]);
    };

    return stdin;
};
