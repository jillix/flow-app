// the mono configuration as global object
CONFIG = require("./config");

// now start a mono server
var Server = new require("./core/server").Server;
    server = new Server();

server.start();
