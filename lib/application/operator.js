var fs = require("fs");
var formidable = require("formidable");

// core operations modules
var mods    = require("./operations/module");
var static  = require("./operations/static");

exports.operation = function(link) {

    // XHR is never cached by default, except in IE, but for this we use this
    link.res.headers["cache-control"] = "no-cache";

    if (link.operation.module === M.config.coreKey) {
        var methodName = link.operation.method;
        var method = mods[methodName] || static[methodName];
        
        checkAndCallFunction(link, method);
        return;
    }

    // if no operation was found in the request URL
    if (!link.operation.module || !link.operation.method) {
        return link.send(400, "Missing module instance ID or operation name");
    }

    M.operation.getWithPermission(link.operation.module, link.operation.method, link.session._rid, function(err, operation) {

        if (err) {
            if (typeof err.code === 'string' && err.code.substr(0, 4) === 'API_') {
                return link.send(404, err.message);
            }
            console.error(err);
            return link.send(500, 'Internal server error');
        }
        
        if (operation.version === M.config.MODULE_DEV_TAG) {
            operation.version += '_' + M.config.app.id;
        }

        var modulePath = operation.source + "/" + operation.owner + "/" + operation.name + "/" + operation.version;
        var file = M.config.APPLICATION_ROOT + M.config.app.id + "/mono_modules/" + modulePath + "/" + operation.file;
        var method = M.util.load(file, link.operation.method);

        checkAndCallFunction(link, method, operation.params);
    });
};

function checkAndCallFunction(link, method, params) {

    if (method instanceof Error) {
        return link.send(500, method);
    }

    if (typeof method !== "function") {
        return link.send(404, "Method must be a function");
    }

    if (params) {
        link.params = params;
    }

    if (link.req.method === "POST") {
        handlePostRequest(link, method);
    }
    else {
        method(link);
        link.req.resume();
    }
}

function handlePostRequest(link, method) {

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
                link.data = jsonString ? JSON.parse(jsonString) : {};
            }
            catch (parseError) {
                err = parseError;
            }

            if (err) {
                return link.send(400, err);
            }

            method(link);
        });
        
        link.req.resume();
    }
    // handle form data requests
    else if (contentType.indexOf("multipart/form-data" ) > -1 || contentType.indexOf("application/x-www-form-urlencoded" ) > -1) {
        
        var form = new formidable.IncomingForm();
        var appDir = M.config.APPLICATION_ROOT + M.config.app.id + "/";
        var uploadDir = appDir + (link.params && link.params.uploadDir ? link.params.uploadDir : null);
        
        if (uploadDir) {

            try {
                uploadDir = fs.realpathSync(uploadDir);
                
                if (uploadDir.indexOf(appDir) != 0) {
                    return link.send(403, "You are only granted write access in your application directory. Also make sure the upload directory exists in your application.");
                }
            } catch(err) {
                // do not give a chance the user to try and guess the server's directory structure
                // based on this error, so, in case of an error we set to a fake path
                uploadDir = null;
            }
        }

        // define upload dir for temporary files
        form.uploadDir = uploadDir || '/dev/null';
        
        // parse form data
        form.parse(link.req, function(err, fields, files) {

            if (err) {
                return link.send(400, err.toString());
            }

            link.data = fields;
            link.files = files;

            // make sure the user receives only relative path to his application
            for (var fileName in files) {
                var file = files[fileName];
                if (file.path) {
                    delete file._writeStream;
                    file.path = file.path.slice(appDir.length);
                }

                // TODO add the same checks when formidable changes the files format
                // There are 2 issues which could probably change the files format:
                // - support for file inputs using name[] format
                //      https://github.com/felixge/node-formidable/issues/33
                // - support for multiple attribute for file input fields
                //      https://github.com/felixge/node-formidable/pull/115
            }
            
            method(link);
        });
        
        link.req.resume();
    }
    else {
        method(link);
        link.req.resume();
    }
}
