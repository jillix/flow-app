var Stream = require('stream');

// writable
exports.Event = function (stdout, stderr) {

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
