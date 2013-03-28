var gzip = require("zlib").gzip;
var ct = {'content-type': "text/plain"};

module.exports = function (code, data) {
    
    var headers = this.res.headers || ct;
    
    headers['server'] = 'Mono Web Server';
    
    data = typeof data === "undefined" || data === null ? '' : data;
    
    if (typeof data === 'object' && data.constructor.name !== 'Buffer') {
        
        headers['content-type'] = "application/json; charset=utf-8";
        
        try {
            data = JSON.stringify(data);
        } catch (err) {
            code = 500;
            data = JSON.stringify(err);
            headers = ct;
        }
    }
    
    if (code >= 400 && M.config.logLevel === 'debug') {
        console.log("DEBUG: " + new Error(data).stack);
    }
    
    if (!headers['content-length']) {
        headers['content-length'] = data.length;
    }
    
    if (!headers['content-encoding'] && headers['content-type']) {
        
        switch (headers['content-type'].split('/')[0]) {
            case 'text':
            case 'application':
                
                if (headers['content-length'] > 666) {
                    
                    var self = this;
                    
                    return gzip(data, function (err, data) {
                        
                        headers['content-length'] = data.length;
                        headers['content-encoding'] = 'gzip';
                        
                        self.res.writeHead(code, headers);
                        self.res.end(data);
                    });
                }
                break;
        }
    }
    
    this.res.writeHead(code, headers);
    this.res.end(data);
};
