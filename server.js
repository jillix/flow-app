// the mono configuration as global object
CONFIG = require("./core/config");

// now start a proxy server or a app server
require("./core/" + (CONFIG.app ? "app_server" : "proxy")).start();
