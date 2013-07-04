var stat = require("node-static").Server;

var client = new stat(M.config.LIB_ROOT + "client", {cache: 604800});
// at this moment the M.config.app contains only the application id
var modules = new stat(M.config.APPLICATION_ROOT + M.config.app.id.toString() + "/mono_modules", {cache: 604800});
var defaultModuleOperation = '/' + M.config.operationKey + '/core/getModuleFile';

exports.getConfig = function(link) {
    
    // get the module instance id
    var miid = link.path[0] ? link.path[0].replace(/[^0-9a-z_\-\.]/gi, "") : null;
    var httpStatusCode = 200;

    if (!miid) {
        return link.send(400, "No miid defined");
    }

    // take into consideration the miid, the role, and the language 
    var cacheKey = miid + '.' + link.session._rid + '.' + link.session._loc;

    // send cached config
    if (M.cache.miids.cache[cacheKey]) {
        return link.send(httpStatusCode, M.cache.miids.get(cacheKey));
    }
    
    // not in cache? find it in the database
    M.module.getConfig(miid, link.session._rid, function(err, config) {

        if (err) {
            if (err.code === 'API_MOD_NOT_FOUND') {
                link.send(403, err.message);
            } else {
                console.error(err.stack || err);
                link.send(500, 'Internal server error');
            }
            return;
        }
        
        // get config or load error config
        if (!config) {
            httpStatusCode = err ? 500 : 404;
            if (!M.config.app.errors) {
                config = 'No error module defined.';
            } else {
                config = M.config.app.errors[httpStatusCode] ||
                    M.config.app.errors['*'] ||
                    'No error module defined.';
            }
        }
        
        // handle i18n html
        if (typeof config.html === 'object') {
            config.html = config.html[link.session._loc] ? config.html[link.session._loc] : defaultModuleOperation;
        }
        
        // TODO what if a module don't have any html at all?
        /*if (!config.html) {
            config.html = defaultModuleOperation;
        }*/
        
        // cache config only when the repsone is ok
        if (httpStatusCode === 200) {
            M.cache.miids.save(cacheKey, config);
        }

        // send config
        link.send(httpStatusCode, config);
    });
};

// browser modules
exports.getModule = function(link) {

    // check if request format is correct
    if (!link.path || link.path.length < 4) {
        return link.send(400, "Incorrect module request URL format");
    }

    // the module name must be almost alphanumeric
    if (link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, "") !== link.pathname) {
        return link.send(400, "Incorrect data in module request URL");
    }

    var module = link.path.slice(0, 4).join('/');
    var path = link.path.slice(4).join("/");

    // find the module in the database
    M.module.getFile(module, link.session._rid, function(err, found) {

        // error checks
        if (err || !found) {
            return link.send(404, err || ("Could not find module: " + modulde));
        }

        // now serve the module file
        link.req.url = module + '/' + path; 
        
        if (M.config.compressFiles) {
            link.res.setHeader('content-encoding', 'gzip');
            link.res.setHeader('vary', 'accept-encoding');
        }
        
        modules.serve(link.req, link.res);
    });
};

exports.getClient = function(link){

    if (M.config.compressFiles) {
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
        link.req.url = link.path[0].split('.')[0] + '.min.gz';
    
    } else {
        link.req.url = link.path[0];
    }
    
    client.serve(link.req, link.res);
};

