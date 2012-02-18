var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    getComp = require(CONFIG.root + "/db/queries.js").getUsersComp;

function buildComp(response, module) {
    
    if (module.module) {
        
        if (!response[0][module.module]) {
            
            response[0][module.module] = [];
        }
        
       response[0][module.module].push(module.config || {});
        
        if (module.css) {
            
            if (!response[2]) {
                
                response[2] = [];
            }
            
            response[2].push(response.css + ".css");
        }
    }
}

this.getComp = function(link) {
    
    getComp(
        
        link.session.uid,
        link.path[2],
        function(err, modules) {
            
            if (err) {
                
                send.notfound(link.res);
            }
            else if (modules) {
                
                if (!(modules instanceof Array)) {
                    
                    modules = [modules];
                }
                
                var response = [{}],
                    next = function(i, l) {
                        
                        if (i < l) {
                            
                            if (modules[i].html) {
                                
                                read("/files/apps/" + modules[i].html + ".html", "utf8", function(err, html) {
                                
                                    if (!err) {
                                        
                                        if (!response[1]) {
                                            
                                            response[1] = html;
                                        }
                                        else response[1] += html;
                                        
                                        buildComp(response, modules[i]);
                                    }
                                    
                                    next(++i, l);
                                });
                            }
                            else {
                                
                                buildComp(response, modules[i]);
                                next(++i, l);
                            }
                        }
                        else {
                            
                            send.ok(link.res, response);
                        }
                    };
                
                next(0, modules.length);
            }
            else {
                
                send.notfound(link.res);
            }
        }
    );
};