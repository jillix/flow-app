var stat = require("node-static").Server;
var client = new stat(M.config.root + "/lib/client");
var modules = new stat(M.config.root + "/apps/" + M.config.app.id + "/mono_modules");
var defaultModuleOperation = '/' + M.config.operationKey + '/core/getModuleFile';

var configCache = {};

exports.getConfig = function(link) {

    // get the module instance id
    var miid = link.path[0] ? link.path[0].replace(/[^0-9a-z_\-\.]/gi, "") : null;

    if (!miid) {
        return link.send(400, "No miid defined");
    }
    
    // send no cache headers IE bug
    link.res.headers["cache-control"] = "no-cache";
    
    var getModuleConfig = function(miid) {
        
        M.module.getConfig(M.config.app.id, miid, link.session._rid, function(err, module) {
            
            var httpStatusCode = 200;
            var config = {};
            
            // test error config
            //delete module.config
            
            // get config or load error config
            if (module && module.config) {
                config = module.config;
                config.path = module.source + "/" + module.owner + "/" + module.name + "/" + module.version;
            } else {
                httpStatusCode = err ? 500 : 404;
                config = M.config.app.errors[httpStatusCode] ||
                    M.config.app.errors['*'] ||
                    M.config.app.errors ||
                    'No error module defined.';
            }
            
            // handle i18n html
            if (typeof config.html === 'object') {
                config.html = config.html[link.session._loc] ? config.html[link.session._loc] : defaultModuleOperation;
            }
            
            if (!config.html) {
                config.html = defaultModuleOperation;
            }
            
            // cache config only when the repsone is ok
            if (httpStatusCode === 200) {
                configCache[miid] = config;
            }
            
            // send config
            link.send(httpStatusCode, config);
        });
    };
    
    // send cached config
    if (configCache[miid]) {
        return link.send(200, configCache[miid]);
    }
    
    getModuleConfig(miid);
};

// browser modules
exports.getModule = function(link) {

    // error checks
    if (!link.path || !link.path[0] || !link.path[1] || !link.path[2] || !link.path[3]) {
        return link.send(400, "Incorrect module request URL format");
    }
    
    // get the module instance id
    var source = link.path[0].replace(/[^0-9a-z_\-\.]/gi, ""),
        owner = link.path[1].replace(/[^0-9a-z_\-\.]/gi, ""),
        name = link.path[2].replace(/[^0-9a-z_\-\.]/gi, ""),
        version = link.path[3].replace(/[^0-9a-z_\-\.]/gi, ""),
        path = link.path.slice(4).join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");

    // the module name must be almost alphanumeric
    if (source.length != link.path[0].length || owner.length != link.path[1].length || name.length != link.path[2].length || version.length != link.path[3].length) {
        return link.send(400, "Incorrect data in module request URL");
    }

    // find the module in the database
    M.module.getFile(source, owner, name, link.session._rid, function(err, module) {

        // error checks
        if (err || !module) {
            return link.send(404, err || ("Could not find module: " + miid));
        }

        // now serve the module file
        link.req.url = source + "/" + owner + "/" + name + "/" + version + "/" + (module.dir ? module.dir + "/" : "") + path;

        modules.serve(link.req, link.res);
    });
};

exports.getClient = function(link){

    link.req.url = link.path[0];
    client.serve(link.req, link.res);
};
