var send    = require(process.env.ROOT + "/core/send.js").send,
    read    = require(process.env.ROOT + "/core/util.js").read,
    getComp = require(process.env.ROOT + "/db/queries.js").getUsersComp;

function buildComp(data, comp) {
    
    if (!data[comp._view]) {
       
       data[comp._view] = [];
    }
                
    var uie = [comp.name, comp.config || {}];
    
    if (comp.css) {
        
        uie[2] = comp.css + ".css";
    }

    data[comp._view].push(uie);
}

this.comp = function(link) {
    
    getComp(
        
        link.session.uid,
        (link.path && link.path[0] != "0" ? link.path[0] : link.req.headers.host),
        function(err, comp) {
            
            if (err) {
                
                send.notfound(link.res);
            }
            else if (comp) {
                
                if (!(comp instanceof Array)) {
                    
                    comp = [comp];
                }
                var data = ["", {}],
                    next = function(i, l) {
                        
                        if (i < l) {
                            
                            if (comp[i].html) {
                                
                                read("/files/apps/" + comp[i].html + ".html", "utf8", function(err, html) {
                                
                                    if (err) {
                                        
                                        next(++i, l);
                                    }
                                    else { 
                                        
                                        data[0] += html;
                                        buildComp(data[1], comp[i]);
                                        next(++i, l);
                                    }
                                });
                            }
                            else {
                                
                                buildComp(data[1], comp[i]);
                                next(++i, l);
                            }
                        }
                        else {
                            
                            send.ok(link.res, data);
                        }
                    };
                
                next(0, comp.length);
            }
            else {
                
                send.notfound(link.res);
            }
        }
    );
};