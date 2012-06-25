var formidable      = require("formidable"),
    util            = require(CONFIG.root + "/core/util.js"),
    send            = require(CONFIG.root + "/core/send.js").send,
    mods            = require(CONFIG.root + "/core/module.js"),
    auth            = require(CONFIG.root + "/core/auth.js"),
    getSession      = require(CONFIG.root + "/core/session.js").get,
    getOperation    = require(CONFIG.root + "/core/model/orient.js").getUserOperation;


exports.operation = function(link) {

    var resume = null;

    // pause on POST requests (cache data until resume is called)
    if (link.req.method == "POST") {
        link.req.pause();
        resume = util.pause(link.req);
    }

    getSession(link, function(err, session) {

        // if no session or an error getting it
        if (err || !session || typeof session.uid !== "number" || typeof session.appid !== "string") {

            if (resume) {
                resume(true);
            }

            send.forbidden(link, err || "No valid session");
            return;
        }

        link.session = session;

        if (link.operation.module === CONFIG.coreKey) {

            var methodName = link.operation.method;
            var method = mods[methodName] || auth[methodName];

            checkAndCallFunction(link, resume, method);
            return;
        }

        // id no operation was found in the request URL
        if (!link.operation.module || !link.operation.method) {

            if (resume) {
                resume(true);
            }

            send.badrequest(link, "Missing module instance or method name");
            return;
        }

        getOperation(link.operation.module, link.operation.method, session.uid, function(err, operation) {

            if (err) {
                if (resume) { resume(true); }
                send.internalservererror(link, err);
                return;
            }

            var modulePath = operation.source + "/" + operation.owner + "/" + operation.name + "/" + operation.version;
            var file = CONFIG.root + "/modules/" + modulePath + "/" + operation.file;
            var method = util.load(file, link.operation.method);

            checkAndCallFunction(link, resume, method, operation.params);
        });
    });
};


function checkAndCallFunction(link, resume, method, params) {

    if (typeof method !== "function") {

        if (resume) {
            resume(true);
        }

        send.notfound(link, "Method must be a function");
        return;
    }

    if (params) {
        link.params = params;
    }

    if (resume) {
        handlePostRequest(link, method, resume);
    }
    else {
        method(link);
    }
}


function handlePostRequest(link, method, resume) {

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
