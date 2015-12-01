var http = require('flowhttp');

exports.http = function (chain, options, onError) {

    // TODO transform object to string/buffer (JSON.stringify)

    /*
    var opts = {
        method: 'GET',
        path: '/' + instance._name + ':' + eventName.substr(1)
        headers: {},
        host: window.location.host,
        port: window.location.port
        responseType: 'response type to set on the underlying xhr object'
    };
    */

    var url = options.emit[0] === '/' || options.emit.indexOf('http') === 0 ? options.emit : '/flow/' + options.to + ':' + options.emit

    // pipe http to flow event stream
    var method = options.method || (options.end ? 'get' : 'post');
    request = http[method](url);
    request.on('response', function (response) {

        if (response.statusCode !== 200) {
            
        }

    });

    chain.i.pipe(request).pipe(chain.o);

    // collect all data for a classic request callback
    if (options.end) {
        var body = '';
        var error;
        request.on('response', function (res) {
            
        })
        request.on('data', function (chunk) {
            body += chunk;
        })
        .on('error', function (err) {
            body = err;
        })
        .on('end', function () {
            if (error) {
                error = body;
                body = undefined;
            }
            options.end(error, body);
        });
        request.end();
    }
};

