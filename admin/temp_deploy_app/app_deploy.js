var http = require("http");
var static = require("node-static");
var file = new(static.Server)(__dirname + '/upload');


http.createServer(function(req, res){
    
    req.addListener('end', function () {
        
        file.serve(req, res);
    });
}).listen(8090);
