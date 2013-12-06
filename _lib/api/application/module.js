var ObjectId = require('mongodb').ObjectID;

// set public access (move this to api initializer)
exports.m_roles = {
    '*': 1
};

// TODO mono miid class
var Mono = {
    emit: function () {},
    on: function () {}
};

function getCachedMiid (link, miid, roleId) {
    // send client config from cache
    if (
        link.API.miids[miid] &&
        (
            // check access
            link.API.miids[miid].m_roles['*'] ||
            link.API.miids[miid].m_roles[roleId]
        ) &&
        link.API.miids[miid].m_client
    ) {
        return link.API.miids[miid];
    }
    
    return null;
}

// TODO return only fields which are needed
// TODO complete client config result with module client dependencies
function loadModule (miid, roleId, callback) {
    var self = this;
    var query = {
        miid: miid,
        roles: ObjectId(roleId)
    };
    
    // get miid config from db
    self.db.app.collection('m_miids').findOne(query, function (err, dbMiid) {
        
        if (err || !dbMiid) {
            // TODO handle error self.error
            // link.API.error(link.API.error.ERROR_MESSAGE, command, JSON.stringify(err))
            return callback(err || 'not found');
        }
        
        // get module version from db
        self.db.app.collection('m_modules').findOne({_id: dbMiid.module}, function (err, module) {
            
            if (err || !module) {
                return callback(err || 'not found');
            }
            
            // require mono module
            var moduleName = module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/';
            var monoModule;
            
            try {
                monoModule = require(self.config.paths.MODULE_ROOT + moduleName + module.index);
            } catch (err) {
                return callback(err || 'Module init error');
            }
            
            // create new Mono observer instance
            var Module = Mono.clone();
            Module.m_name = moduleName;
            Module.m_miid = miid;
            Module.m_client = dbMiid.client;
            
            // add roles to cache
            Module.m_roles = {};
            for (var i = 0, l = dbMiid.roles.length; i < l; ++i) {
                Module.m_roles[dbMiid.roles[i]] = 1;
            }
            
            // init mono module and save in cache
            // TODO update this cache when a miid config changes
            self.miids[miid] = monoModule.call(Module, dbMiid.server);
            
            callback(null,  Module.m_client || {});
        });
    });
}

exports.load = function(link) {
    var self = this;
    var miid = link.data;
    var method = link.operation.method;
    
    // send client config from cache
    var cachedMiid = getCachedMiid(link, miid, link.session._rid);
    if (cachedMiid) {
        return link.send(200, cachedMiid.m_client);
    }
    
    // load and init module
    loadModule.call(link.API, miid, link.session._rid, function (err, config) {
        
        if (err) {
            return link.send(404, err || 'not found');
        }
        
        // handle i18n html
        if (typeof config.html === 'object') {
            config.html = config.html[link.session._loc] ? config.html[link.session._loc] : 'no html found';
        }
        
        // return client config
        link.send(200, config);
    });
};

// browser modules
exports.module = function(link) {
    
    var miid = link.path[0];
    var file = link.path[1];
    
    // check if request format is correct
    if (!miid || !file) {
        return link.send(400, "Incorrect module request URL format");
    }
    
    // the module name must be almost alphanumeric
    if (link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, "") !== link.pathname) {
        return link.send(400, "Incorrect data in module request URL");
    }
    
    // get miid from cache
    var cachedMiid = getCachedMiid(link, miid, link.session._rid);
    if (cachedMiid) {
        
        // handle compression
        if (link.API.config.compressFiles) {
            link.res.setHeader('content-encoding', 'gzip');
            link.res.setHeader('vary', 'accept-encoding');
        }
        
        // overwrite url
        link.req.url = cachedMiid.m_name + file;
        
        // server file
        return link.API.file.module.serve(link.req, link.res);
    }
    
    link.send(404, 'Miid not found');
};

exports.client = function(link){
    
    if (link.API.config.compressFiles) {
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
        link.req.url = link.path[0].split('.')[0] + '.min.gz';
    
    } else {
        link.req.url = link.path[0];
    }
    
    link.API.file.client.serve(link.req, link.res);
};

// TODO for what is this method used??
exports.getFile = function (link) {
    
    if (link.API.config.compressFiles && link.API.config.compressFileTypes[link.pathname.split('.').pop()]) {
        
        link.res.setHeader('content-encoding', 'gzip');
        link.res.setHeader('vary', 'accept-encoding');
    }
    
    // reqrite url
    link.req.url = (link.API.config.publicDir ? link.API.config.publicDir + "/" : "") + link.path.join("/").replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    files.serve(link.req, link.res);
};
