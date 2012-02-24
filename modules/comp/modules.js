var send = require( CONFIG.root + "/core/send.js" ).send,
    getModule = require( CONFIG.root + "/db/queries.js" ).getUsersModule,
    modules = new ( require( "node-static" ).Server )( CONFIG.root + "/modules" );

//browser modules
this.getModule = function( link ) {
    
    if (link.path && typeof link.path[2] != "undefined") {
        
        var module = link.path[2].replace(/[^0-9a-z_\-]/gi, "");
        
        if (module !== "") {
        
            getModule(module, link.session.uid, function(err, res) {
                
                if (err || !res.module) {
                    
                    send.notfound(link.res);
                }
                else {
                    
                    link.req.url = res.module + (res.dir || "") + "/" + link.path.slice(3).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
                    
                    modules.serve(link.req, link.res);
                }
            });
        }
        else {
            
            send.badrequest(link.res);
        }
    }
    else {
    
        send.badrequest(link.res);
    }
};