var stat = require("node-static").Server;

//var defaultModuleOperation = '/' + M.config.operationKey + '/core/getModuleFile';

// TODO get config from db
function getConfigDb (M, miid, roleId, callback) {

    var queryMiid = {
        application: M.config.id,
        miid: miid,
        roles: parseInt(roleId, 10)
    };

    M.db.miids.findOne(queryMiid, {fields: {_id:0, config:1, module:1, version: 1}}, function (err, miid) {
        
        if (err) {
            return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, command, JSON.stringify(err)));
        }
        
        if (!miid) {
            return callback(M.error(M.error.API_MIID_NOT_FOUND, queryMiid.miid));
        }

        var queryMod = {
            _id: miid.module,
            'versions.version': miid.version
        };

        M.db.miids.findOne(queryMod, {fields: {_id: 0, name: 1, owner: 1, source: 1, 'versions.$.deps': 1}}, function (err, module) {

            if (err) {
                return callback(M.error(M.error.DB_MONGO_QUERY_ERROR, command, JSON.stringify(err)));
            }

            if (!module) {
                return callback(M.error(M.error.API_MOD_NOT_FOUND, queryMiid.miid));
            }
            
            if (!module.source || !module.owner || !module.name || !miid.version) {
               return callback(M.error(M.error.DB_MONGO_INVALID_RECORD, 'module', JSON.stringifyi(module))); 
            }
            
            // append the miid scripts (defined by the application) to the end of the array
            // this way they will be loaded first
            if (miid.config && miid.config.scripts && module.versions[0].deps) {
                miid.config.scripts = module.versions[0].deps.concat(miid.config.scripts);
            }

            // add modle path to config
            miid.config.path = module.source + '/' + module.owner + '/' + module.name + '/' + miid.version,

            callback(null, miid.config);
        });
    });
}

exports.getConfig = function(M, link) {
    
    // get the module instance id
    var httpStatusCode = 200;

    if (!link.data) {
        return link.send(400, "No miid defined");
    }

    // take into consideration the miid, the role, and the language 
    var cacheKey = link.data + '.' + link.session._rid + '.' + link.session._loc;
    var cachedMiid = M.cache.miids.get(cacheKey);

    // send cached config
    if (cachedMiid) {
        return link.send(httpStatusCode, cachedMiid);
    }
    
    // not in cache? find it in the database
    getConfigDb(M, link.data, link.session._rid, function(err, config) {
        console.log(err);
        if (err) {
            if (err.code === 'API_MIID_NOT_FOUND') {
                link.send(403, err.message);
            } else {
                link.send(500, 'Internal server error');
            }
            return;
        }
        
        // get config or load error config
        if (!config) {
            httpStatusCode = err ? 500 : 404;
            if (!M.config.error) {
                config = 'No error module defined.';
            } else {
                config = M.config.error[httpStatusCode] ||
                    M.config.error['*'] ||
                    'No error message found.';
            }
        }
        
        // handle i18n html
        if (typeof config.html === 'object') {
            config.html = config.html[link.session._loc] ? config.html[link.session._loc] : 'no html found';
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
exports.module = function(M, link) {

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
    
    // TODO solve this problem in a different way
    if (version === M.config.MODULE_DEV_TAG) {
        version += '_' + M.config.app.id;
    }

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
        
        self.file.module.serve(link.req, link.res);
    });
};

exports.client = function(M, link){
    
    if (M.config.compressFiles) {
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
        link.req.url = link.path[0].split('.')[0] + '.min.gz';
    
    } else {
        link.req.url = link.path[0];
    }
    
    M.file.client.serve(link.req, link.res);
};

exports.getFile = function (M, link) {
    
    if (M.config.compressFiles && M.config.compressFileTypes[link.pathname.split('.').pop()]) {
        
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
    }
    
    // reqrite url
    link.req.url = (M.config.publicDir ? M.config.publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    files.serve(link.req, link.res);
};

exports.getLog = function (M, link) {
    files.serveFile("log.txt", 200, {}, link.req, link.res);
};

// TODO get default module html && css
exports.getModuleFile = function (M, link) {
    link.send(501, 'Not "yet" implemented.');
};
