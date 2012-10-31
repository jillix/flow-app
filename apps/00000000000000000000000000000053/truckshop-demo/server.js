var server = require("http");
var nodeStatic = require("../editor/node_modules/node-static");
var file = new (nodeStatic.Server)("./");

server.createServer(function (req, res) {
    
    req.addListener("end", function () {
        
        file.serve(req, res);
    });
    
}).listen(8888, "192.168.1.49");
