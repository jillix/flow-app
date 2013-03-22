var util = require("util");
var ct = {'content-type': "text/plain"};

module.exports = function (code, data) {
    
    data = typeof data === "undefined" || data === null ? '' : data;
    
    if (typeof data === 'object' && data.constructor.name !== 'Buffer') {
        
        this.res.headers['content-type'] = "application/json; charset=utf-8";
        
        try {
            data = JSON.stringify(data);
        } catch (err) {
            code = 500;
            data = JSON.stringify(err);
            this.res.headers = ct;
        }
    }
    
    if (code >= 400 && M.config.logLevel === 'debug') {
        util.log("DEBUG: " + new Error(data).stack);
    }
    
    this.res.writeHead(code, this.res.headers || ct);
    this.res.end(data);
};
