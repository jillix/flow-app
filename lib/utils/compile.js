var http = require('http');
var QS = require('querystring');
var options = {
    hostname: 'closure-compiler.appspot.com',
    path: '/compile',
    method: 'POST',
    headers: {
        'content-type': 'application/x-www-form-urlencoded'
    }
};

module.exports = compile;

function compile (code, callback) {

    // create params
    var params = QS.stringify({
        output_format: 'json',
        output_info: 'compiled_code',
        compilation_level: 'SIMPLE_OPTIMIZATIONS',
        js_code: typeof code !== 'string' ? code.toString() : code
    });

    // make http request
    var req = http.request(options, function (res) {

        var compiledCode = '';
        res.on('end', function () {

            try {
                compiledCode = JSON.parse(compiledCode).compiledCode;
            } catch (err) {
                return callback(err);
            }

            callback(null, compiledCode);
        });

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            compiledCode += chunk;
        });
    });

    // handle request error
    req.on('error', function(e) {
        callback(e.message);
    });

    // write params to request body
    req.write(params);
    req.end();
}
