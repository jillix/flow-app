var http = require('flowhttp');

exports.request = function (chain, options, onError) {

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

    if (!options.url) {
        console.log(options);
        chain.i.emit('error', new Error('Engine.http: No url.'));
    }

    // pipe http to flow event stream
    request = http[options.method || 'post'](options.url);
    request.on('error', onError);
    chain.i.pipe(request).pipe(chain.o);
};

