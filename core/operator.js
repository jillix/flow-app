var util            = require(process.env.ROOT + "/core/util"),
    formidable      = require("formidable"),
    getSession      = require(process.env.ROOT + "/core/session").get,
    getOperation    = require(process.env.ROOT + "/db/queries").getOperation;

var send = require(process.env.ROOT + "/core/send").send;

this.operation = function(link) {
    
    //pause request on POST requests
    if (link.req.method == "POST") {
        
        var resume = util.pause(req);
    }
    
    getSession(link.req.headers['x-sid'] || (link.query ? link.query._s : null), function(err, session){
        
        if (!err && session) {
            
            send.ok(link.res, link.path[1]);
        }
        else {
            
            send.forbidden(link.res);
        }
        
        if (typeof resume != "undefined") {
            
            resume();
        }
    });
    /*
    getOperation(operationID, function(err, operation) {
    
        if (err || !operation || !operation.file || !operation.method) {
                        
            if (process.env.DEV) {
                
                console.log(err || new Error( "No Operation found.." ));
            }
            
            send.forbidden(res);
        }
        else {
            
            var method = util.load(operation.file, operation.method);
            
            if (typeof method == "function") {
                
                // create link
                var link = {
                    
                    res: res,
                    req: req,
                    session: session
                };
                
                // add pathinfo to link
                if (path[1]) {
                    
                    link.path = path.slice(1);
                }
                
                // add query info to link
                if (url.query) {
                    
                    link.query = url.query;
                }
                
                // set empty header object
                link.res.headers = {};
                
                // add operations envoirenment variables
                if (operation.env) {
                    
                    link.env = operation.env;
                }
                
                if (operation.params) {
                    
                    link.params = operation.params;
                }
                
                // handle get request
                if (typeof resume == "undefined") {
                    
                    method( link );
                }
                
                // handle post request
                else {
                
                    var contentType = link.req.headers['content-type'] || "";
                    
                    // handle json requests
                    if (contentType.indexOf("application/json") > -1) {
                        
                        var jsonString = "",
                            err;
                        
                        // buffer data
                        link.req.on("data", function(chunk) {
                            
                            jsonString += chunk.toString("utf-8");
                        });
                        
                        // if all data are received 
                        link.req.on("end", function() {
                            
                            try {
                                
                                // try to parse response to Object
                                jsonString = jsonString ? JSON.parse(jsonString) : {};
                            }
                            catch(parseError) {
                                
                                if (process.env.DEV) {
                                    
                                    console.log(parseError);
                                }
                                
                                err = parseError;
                            }
                            
                            if (err) {
                                
                                send.badrequest(link.res);
                            }
                            else {
                                
                                method(link);
                            }
                        });
                    }
                    // handle form data requests
                    else if (contentType.indexOf("multipart/form-data" ) > -1  ) {
                        
                        var form = new formidable.IncomingForm();
                        
                        // define upload dir for temporary files
                        form.uploadDir = process.env.APPS + "/" + app.name + "/files/tmp";
                        
                        // parse form data
                        form.parse(link.req, function(err, fields, files) {
                            
                            if (err) {
                                
                                if (process.env.DEV) {
                                    
                                    console.log( err );
                                }
                                
                                send.internalservererror(link.res);
                            }
                            else {
                                
                                link.data = fields;
                                
                                if (files) {
                                    
                                    for(var file in files) {
                                        
                                        link.data[file] = files[file];
                                    }
                                }
                                
                                method(link);
                            }
                        });
                    }
                    else {
                        
                        method(link);
                    }
                    
                    resume();
                }
            }
            else {
                
                send.notfound(res);
            }
        }
    });
    */
};