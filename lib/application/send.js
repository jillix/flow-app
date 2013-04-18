var gzip = require('zlib').gzip;
var compressLimit = 888;

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
        headers['content-type'] = 'application/json; charset=utf-8';
    } catch (err) {
        headers['content-type'] = 'text/plain';
        return false;
    }

    if (data === undefined) {
        return false;
    }

    return new Buffer(data);
}

module.exports = function (code, data) {
    
    var headers = this.res.headers || {'content-type': 'text/plain'};
    
    headers['server'] = 'Mono Web Server';

    data = convertToBuffer(data, headers)
    
    if (data === false) {
        code = 500;
        data = M.error(M.error.APP_SEND_JSON_STRINGIFY);
    }
    
    if (code >= 400 && M.config.logLevel === 'debug') {
        console.log("DEBUG: " + data);
    }
    
    if (data.length > compressLimit && !headers['content-encoding'] && headers['content-type']) {
        
        switch (headers['content-type'].split('/')[0]) {
            case 'text':
            case 'application':
                
                var self = this;
                
                return gzip(data, function (err, data) {
                    
                    headers['content-length'] = data.length;
                    headers['content-encoding'] = 'gzip';
                    
                    self.res.writeHead(code, headers);
                    self.res.end(data);
                });
                
                break;
        }
    }
    
    headers['content-length'] = data.length;
    
    this.res.writeHead(code, headers);
    this.res.end(data);
};
