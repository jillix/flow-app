var gzip = require('zlib').gzip;
var compressLimit = 680;
var defaultHeader = {'content-type': 'text/plain'};

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

exports.sendWs = function (code, data) {
    var self = this;
    
    // send binary data directly
    if (data instanceof Buffer) {
        return self.ws.send(data);
    }
    
    // parse json
    try {
        data = JSON.stringify(data);
    } catch (err) {
        code = 400;
        // TODO make a ws error message handler
        data = '{"msg": "' + err.message + '"}';
    }
    
    // send data
    self.ws.send('[' + code + ',' + data + ']');
};

exports.sendHttp = function (code, data) {
    var self = this;
    var headers = this.res.headers || defaultHeader;
    
    headers.server = 'Mono Web Server';
    
    data = convertToBuffer(data, headers);
    
    if (data === false) {
        code = 500;
        data = self.error(self.error.APP_SEND_JSON_STRINGIFY);
    }
    
    /*if (code >= 400 && self.config.logLevel === 'debug') {
        console.log("DEBUG: " + data);
    }*/
    
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
    
    this.res.writeHead(code, headers);
    this.res.end(data);
    
    /*if (self.config.logLevel === 'verbose') {
        console.log('Request time: ' + (new Date().getTime() - this.time) + 'ms' + ' | ' + this.pathname);
    }*/
};

exports.stream = function (link) {
    var self = this;
    
    var first = true;
    var isJSON = false;
    var error = false;

    return {
        
        start: function (code) {

            var headers = link.res.headers || defaultHeader;
            headers['server'] = 'Mono Web Server';
            link.res.writeHead(code, headers);

            if (headers['content-type'].indexOf('application/json') > -1) {
                isJSON = true;
                link.res.write(new Buffer('['));
            } else {
                isJSON = false;
            }

            first = true;
            error = false;
        },

        error: function (err) {
            error = true;
            link.res.write(convertToBuffer(err));
        },
        
        data: function (data) {
            
            if (error) {
                return;
            }

            // TODO compress stream data
            data = convertToBuffer(data);

            if (!first && isJSON) {
                data = Buffer.concat([new Buffer(','), data]);
            } else {
                first = false;
            }

            link.res.write(data);
        },

        end: function (){
            
            if (isJSON) {
                link.res.write(new Buffer(']'));
            }

            first = true;
            error = false;

            link.res.end();
            
            if (self.config.logLevel === 'verbose') {
                console.log('Request time: ' + (new Date().getTime() - link.time) + 'ms' + ' | ' + link.pathname);
            }
        }
    };
};

