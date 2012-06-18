var send = require( CONFIG.root + "/core/send.js" ).send;

this.saveFile = function(link){
    
    send.ok(link.res);
};