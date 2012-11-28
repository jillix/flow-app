// the mono configuration as global object
CONFIG = require("./config");

// now start a mono server

var starter = "mono_server";
if (CONFIG.app) {
    starter = "app_server";
}

var Server = require("./core/" + starter).Server;
    server = new Server();

server.start();

