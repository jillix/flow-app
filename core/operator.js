var formidable      = require("formidable"),
    util            = require(CONFIG.root + "/core/util.js"),
    send            = require(CONFIG.root + "/core/send.js").send,
    getSession      = require(CONFIG.root + "/core/session.js").get,
    getOperation = require(CONFIG.root + "/core/model/orient.js").getUserOperation;


exports.operation = function(link) {

    var resume = null;

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

            send.forbidden(link, err || "No valid session");
            return;
        }

        link.session = session;

        // read the operation from the request URL
        //var moduleName = link.path[1] && link.path[2] ? (link.path[1] + "/" + link.path[2]) : null,
        //    methodName = link.path[3] ? link.path[3] : null;

        // id no operation was found in the request URL
        if (!link.operation.module || !link.operation.method) {

            if (resume) {
                resume(true);
            }

            send.badrequest(link, "Missing Modulename or Methodname.");
            return;
        }

        getOperation(link.operation.module, link.operation.method, session.uid, function(err, operation) {

            if (err) {
                if (resume) { resume(true); }
                send.internalservererror(link, err);
                return;
            }

            var file = CONFIG.root + "/modules/" + link.operation.module + "/" + operation.file;
            var method = util.load(file, link.operation.method);

            if (typeof method !== "function") {

                if (resume) {
                    resume(true);
                }

                send.notfound(link, "Method must be a function");
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
            catch (parseError) {
                err = parseError;
            }

            if (err) {
                send.badrequest(link, err);
                return;
            }

            method(link);
        });
    }
    // handle form data requests
    else if (contentType.indexOf("multipart/form-data" ) > -1 || contentType.indexOf("application/x-www-form-urlencoded" ) > -1) {

        var form = new formidable.IncomingForm();

        // define upload dir for temporary files
        form.uploadDir = link.params && link.params.uploadDir ? link.params.uploadDir : CONFIG.uploadDir;

        // parse form data
        form.parse(link.req, function(err, fields, files) {

            if (err) {
                send.badrequest(link, err);
                return;
            }

            link.data = fields;

            if (files) {
                for(var file in files) {
                    link.data[file] = files[file];
                }
            }

            method(link);
        });
    }
    else {
        method(link);
    }

    resume();
}

