var http = require('flowhttp');

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

    // return duplex stream
    return http[options.method || 'post'](url);
};

