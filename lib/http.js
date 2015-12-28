var http = require('flowhttp');
var Stream = require('stream');

exports.request = function (options) {

    // TODO transform object to string/buffer (JSON.stringify)

    /*
    var opts = {
        method: 'POST|GET|PUT|DELETE',
        path: '/' + instance._name + ':' + eventName.substr(1)
       headers: {},
        host: window.location.host,
        port: window.location.port
        responseType: 'response type to set on the underlying xhr object'
    };
    */

    var url = options.url || ('/flow/' + options.to + ':' + options.emit);
    var output = Stream.PassThrough();
    var input = http[options.method || 'post'](url);
    input.pipe(output);

    // check status code and emit error
    input.on('response', function (res) {
        var code = res.statusCode;
        if (code > 299) {

            // end output stream immediately
            output.end();

            // collect error data
            var resData = '';
            res.on('data', function (chunk) {
                resData += chunk.toString();
            });

            // emit error on response end
            res.on('end', function () {
                var err = new Error(resData);
                err.statusCode = code;
                output.emit('error', err);
            });
        }
    });

    return {i: input, o: output};
};

