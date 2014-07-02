var gzip = require('zlib').gzip;
var M = process.mono;
var compressLimit = 680;
var defaultHeader = {'content-type': 'text/plain'};

exports.broadcast = broadcast;
exports.message = message;
exports.link = link;
exports.httpError = httpError;
exports.wsError = wsError;

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

function createMessage (instanceName, event, err, data, msgId) {

    // return if data is binary
    if (data instanceof Buffer) {
        return data;
    }

    // mono ws protocoll: ["instanceName:event:msgid","err","data"]
    var message = [instanceName + ':' + event];

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
function message (event, err, data) {
    var self = this;

    self.ws.send(createMessage(self.Z.name, event, err, data, self.id), function(error) {
        // sometimes a socket is closed before the operation is complete.
        // those errors can be ignored
    });
}

// broadcast message to all connected sockets
function broadcast (event, err, data) {
    var self = this;

    data = createMessage(self.Z.name, event, err, data);

    // broadcast
    for (var i = 0, l = M.ws.clients.length; i < l; ++i) {
        M.ws.clients[i].send(data);
    }
}

// send server http errors
function httpError (req, res, code, err) {

    err = err.message || err;

    req.resume();
    res.statusCode = code;
    res.end(convertToBuffer(err));
}

// send server websocket errors
function wsError (ws, err, msgId) {
    ws.send(createMessage(M.config.coreInstance, 'error', err, null, msgId));
}

// request response for operations
function link (code, data) {
    var self = this;

    var headers = self.res.headers || defaultHeader;
    headers.server = 'Mono Web Server';

    data = convertToBuffer(data, headers);

    if (data === false) {
        code = 500;
        data = M.error(M.error.APP_SEND_JSON_STRINGIFY);
    }

    if (code >= 400 && M.config.logLevel === 'debug') {
        console.log("DEBUG: " + data);
    }

    if (data.length >= compressLimit && !headers['content-encoding'] && headers['content-type']) {

        switch (headers['content-type'].split('/')[0]) {
            case 'text':
            case 'application':

                self = this;

                return gzip(data, function (err, data) {

                    headers['content-length'] = data.length;
                    headers['content-encoding'] = 'gzip';

                    self.res.writeHead(code, headers);
                    self.res.end(data);
                });
        }
    }

    headers['content-length'] = data.length;

    self.res.writeHead(code, headers);
    self.res.end(data);

    if (M.logLevel === 'verbose') {
        console.log('Request time: ' + (new Date().getTime() - this.time) + 'ms' + ' | ' + this.pathname);
    }
}
