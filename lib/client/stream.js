var utils = require('./utils');
var LocalStream = require('./stream_local');
var SocketStream = require('./stream_socket');
var HttpStream = require('./stream_http');

// reset links cache on reload
/*engine.on('reload', function () {
    engine._links = {};
    
    // close the websocket and reconnect immedialtey
    engine.socket.close(3000);
});*/

// link factory
exports.local = LocalStream;
exports.ws = SocketStream;
exports.http = HttpStream;
