var env = process.env;
var gzip = require('zlib').gzip;
var compressLimit = 680;
var defaultHeader = {'content-type': 'text/plain'};
var WS;

exports.broadcast = broadcast;
exports.message = message;
exports.link = link;
exports.httpError = httpError;
exports.wsError = wsError;
exports.setWebsocket = function (ws) {
    WS = ws;
};

function convertToBuffer (data, headers) {

    if (data === undefined) {
        return new Buffer(0);
    }

    if (typeof data === 'string') {
        return new Buffer(data);
    }

    if (data instanceof Buffer) {
        return data;
    }

    try {
        data = JSON.stringify(data);

        if (headers) {
            headers['content-type'] = 'application/json; charset=utf-8';
        }
    } catch (err) {
        if (headers) {
            headers['content-type'] = 'text/plain';
        }
        return false;
    }

    if (data === undefined) {
        return false;
    }

    return new Buffer(data);
}

function createMessage (instanceName, err, data, msgId) {

    // return if data is binary
    if (data instanceof Buffer) {
        return data;
    }

    // protocoll: ["instanceName:msgid","err","data"]
    var message = [instanceName];

    if (msgId) {
        message[0] += ':' + msgId;
    }

    if (data) {
        message[1] = 0,
        message[2] = data;
    }

    if (err) {
        message[1] = err.message || err;
    }

    // parse json
    try {
        message = JSON.stringify(message);
    } catch (err) {
        message[1] = err.message;
    }

    return message;
}

// send a message on the origin socket
function message (err, data) {
    var self = this;

    self.ws.send(createMessage(self._._name, err, data, self.id), function(error) {
        // sometimes a socket is closed before the operation is complete.
        // those errors can be ignored
    });
}

// broadcast message to all connected sockets
function broadcast (event, err, data) {
    var self = this;

    data = createMessage(self._._name, event, err, data);

    // broadcast
    for (var i = 0, l = WS.clients.length; i < l; ++i) {
        WS.clients[i].send(data);
    }
}

// send server websocket errors
function wsError (ws, err, msgId) {
    ws.send(createMessage(env.Z_CORE_INST, 'error', err, null, msgId));
}

// send server http errors
function httpError (req, res, code, err) {

    err = err.message || err;

    req.resume();
    res.statusCode = code;
    res.end(convertToBuffer(err));
}

// request response for operations
function link (code, data) {
    var self = this;

    var headers = self.headers || defaultHeader;
    headers.Server = 'JCES';

    data = convertToBuffer(data, headers);

    if (data === false) {
        code = 500;
        data = 'JSON stringify error';
    }

    headers['Content-Length'] = data.length;

    self.res.writeHead(code, headers);
    self.res.end(data);
}
