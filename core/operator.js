var formidable      = require("formidable"),
    util            = require(CONFIG.root + "/core/util.js"),
    send            = require(CONFIG.root + "/core/send.js").send,
    getSession      = require(CONFIG.root + "/core/session.js").get,
    getOperation    = require(CONFIG.root + "/db/queries.js").getUsersOperation;
    getNewOperation = require(CONFIG.root + "/core/model/orient.js").getOperation;


exports.operation = function(link) {

    var resume;

    // pause on POST requests (cache data until resume is called)
    if (link.req.method == "POST") {
        link.req.pause();
        resume = util.pause(link.req);
    }

    getSession(link, function(err, session) {

        // if no session or an error getting it
        if (err || !session) {
            
            if (resume) {
                resume(true);
            }
            
            send.forbidden(link.res);
            return;
        }

        link.session = session;

        // read the operation from the request URL
        var operationId = link.path[1] ? link.path[1] : null;

        // id no operation was found in the request URL
        if (!operationId) {

            if (resume) {
                resume(true);
            }

            send.badrequest(link.res);
            return;
        }

        getNewOperation(operationId, /*session.uid, */ function(err, operation) {

            // is the operation does not have the required fields or an error occurred while retrieving it
            // TODO these two cases must be split and reported/logged properly
            if (err || !operation || !operation.module || !operation.file || !operation.method) {

                if (resume) {
                    resume(true);
                }

                send.notfound(link.res);
                return;
            }

            var file = CONFIG.root + "/modules/" + operation.module + "/" + operation.file;
            var method = util.load(file, operation.method);

            if (typeof method !== "function") {

                if (resume) {
                    resume(true);
                }

                send.notfound(link.res);
                return;
            }

            if (operation.params) {
                link.params = operation.params;
            }

            if (resume) {
                handlePostRequest(link, resume);
            }
            else {
                method(link);
            }
        });
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
    else if (contentType.indexOf("multipart/form-data" ) > -1 || contentType.indexOf("application/x-www-form-urlencoded" ) > -1) {
        
        var form = new formidable.IncomingForm();
        
        //define upload dir for temporary files
        form.uploadDir = link.params && link.params.uploadDir ? link.params.uploadDir : CONFIG.uploadDir;
        
        //parse form data
        form.parse(link.req, function(err, fields, files) {
            
       debugger; 
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

