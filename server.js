// extend Object prototype with clone function
Object.defineProperty(Object.prototype, "clone", {
        
    // writeable: false, (default value)
    // enumerable: false, (default value)
    // configurable: false, (default value)
    value: function(){
        function O(){}
        O.prototype = this;
        return new O();
    }
});


// the mono configuration as global object
CONFIG = require(process.argv[2] || "./config.js");


// now start a mono server
var Server = new require("./core/server").Server;
    server = new Server();

server.start();

