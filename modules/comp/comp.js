var send = require(CONFIG.root + "/core/send.js").send,
    read = require(CONFIG.root + "/core/util.js").read,
    getComp = require(CONFIG.root + "/core/model/orient.js").getUserComponent,
    files = new ( require( "node-static" ).Server )( CONFIG.root + "/files/domains" );


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
            
            response[2].push(module.css + ".css");
        }
    }
}

exports.getComp = function(link) {

    getComp(link.path[2], link.session.uid, function(err, modules) {

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
                                
                                read("/files/domains/" + modules[i].html + ".html", "utf8", function(err, html) {
                                
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

exports.getFile = function(link){

    if (link.params && link.params.dir) {
        link.req.url = link.params.dir + link.path.slice(2).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
        files.serve(link.req, link.res);
    }
    else {
        send.forbidden(link.res);
    }
};
