var formidable      = require("formidable"),
    util            = require(CONFIG.root + "/core/util.js"),
    send            = require(CONFIG.root + "/core/send.js").send,
    getSession      = require(CONFIG.root + "/core/session.js").get,
    getOperation    = require(CONFIG.root + "/db/queries.js").getUsersOperation;


exports.operation = function(link) {
    
    var resume;
    
    //pause on POST requests (chache data untile resume is called)
    if (link.req.method == "POST") {
        resume = util.pause(req);
    }
    
    getSession(link, function(err, session){
        
        if (!err && session) {
            
            var operationId = link.path[1] ? link.path[1].replace( /[^a-z0-9]/gi, "" ) : null;
            
            if (operationId) {
                
                getOperation(operationId, session.uid, function(err, operation){
                    
                    if (err || !operation || !operation.module || !operation.file || !operation.method) {
                    
                        if (resume) {
                            resume(true);
                        }
                        
                        send.notfound(link.res);
                    }
                    else {
                        
                        var file = CONFIG.root + "/modules/" + operation.module + "/" + operation.file;
                        var method = util.load(file, operation.method);
                        
                        if (typeof method == "function") {
                            
                            link.session = session || {};
                            
                            if (operation.params) {
                                link.params = operation.params;
                            }
                            
                            if (resume) {
                                handlePostRequest(link, resume);
                            }
                            else {
                                method(link);
                            }
                        }
                        else {
                            
                            if (resume) {
                                resume(true);
                            }
                            
                            send.notfound(link.res);
                        }
                    }
                });
            }
            else {
                
                if (resume) {
                    resume(true);
                }
                
                send.badrequest(link.res);
            }
        }
        else {
            
            if (resume) {
                resume(true);
            }
            
            send.forbidden(link.res);
        }
    });
};


function handlePostRequest(link, resume) {
    
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
                
                if (CONFIG.dev) {
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
    //handle form data requests
    else if (contentType.indexOf("multipart/form-data" ) > -1) {
        
        var form = new formidable.IncomingForm();
        
        //define upload dir for temporary files
        form.uploadDir = link.params && link.params.uploadDir ? link.params.uploadDir : CONFIG.uploadDir;
        
        //parse form data
        form.parse(link.req, function(err, fields, files) {
            
            if (err) {
                
                if (CONFIG.dev) {
                    console.log( err );
                }
                
                send.badrequest(link.res);
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

