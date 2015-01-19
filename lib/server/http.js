var env = process.env;
var compressLimit = 680;
var defaultHeader = {'content-type': 'text/plain'};

exports.broadcast = broadcast;
exports.message = message;
exports.link = link;
exports.httpError = httpError;

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
