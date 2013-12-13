var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var M = process.mono;

function getCachedMiid (miid, roleId) {
    
    // send client config from cache
    if (
        M.miids[miid] &&
        (
            // check access
            M.miids[miid].m_roles['*'] ||
            M.miids[miid].m_roles[roleId]
        ) &&
        M.miids[miid].m_client
    ) {
        return M.miids[miid];
    }
    
    return null;
}

function sendHandler (event) {
    return function (err, data, callback) {
        var self = this;
        console.log('\n');
        console.log(self.link.event, event, self.link.id);
        // websocket link
        if (self.link.ws) {
            return self.link.send(self.m_miid, event, err, data, callback);
        }
    };
}

// TODO return only fields which are needed
function loadModule (miid, roleId, callback) {
    var self = this;
    var query = {
        miid: miid,
        roles: ObjectId(roleId)
    };
    
    // get miid config from db
    M.db.app.collection('m_miids').findOne(query, function (err, dbMiid) {
        
        if (err || !dbMiid) {
            // TODO handle error self.error
            // M.error(M.error.ERROR_MESSAGE, command, JSON.stringify(err))
            return callback(err || 'not found');
        }
        
        // get module version from db
        M.db.app.collection('m_modules').findOne({_id: dbMiid.module}, function (err, module) {
            
            if (err || !module) {
                return callback(err || 'not found');
            }
            
            // require mono module
            var moduleName = module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/';
            var monoModule;
            
            try {
                monoModule = require(M.config.paths.MODULE_ROOT + moduleName + module.index);
            } catch (err) {
                return callback(err || 'Module init error');
            }
            
            // create new Mono observer instance
            // TODO broadcast option self.emit('operationA');
            var Module = new EventEmitter();
            Module.m_name = moduleName;
            Module.m_miid = miid;
            Module.m_client = dbMiid.client;
            
            // save module name in client config
            Module.m_client.name = Module.m_name;
            
            // add roles to cache
            Module.m_roles = {};
            for (var i = 0, l = dbMiid.roles.length; i < l; ++i) {
                Module.m_roles[dbMiid.roles[i]] = 1;
            }
            
            // merge scripts
            if (module.dependencies) {
                Module.m_client.scripts = module.dependencies.concat(Module.m_client.scripts || []);
            }
            
            // handle network events
            if (dbMiid.events) {
                
                // add client events config to client config
                if (dbMiid.events.client) {
                    Module.m_client.events = dbMiid.events.client;
                }
                
                // listen to server events
                // TODO this are the events which have automatically the send handler
                if (dbMiid.events.server) {
                    for (var i = 0, l = dbMiid.events.server.length; i < l; ++i) {
                        Module.on(dbMiid.events.server[i], sendHandler(dbMiid.events.server[i]));
                    }
                }
            }
            
            // init mono module and save in cache
            // TODO update this cache when a miid config changes
            M.miids[miid] = Module;
            monoModule.call(Module, dbMiid.server.data);
            
            callback(null,  Module.m_client || {});
        });
    });
}

// load miid configuration (ws)
function load (err, miid) {
    var self = this;
    
    // send client config from cache
    var cachedMiid = getCachedMiid(miid, self.link.session._rid);
    if (cachedMiid) {
        return self.link.send(cachedMiid.m_client);
    }
    
    // load and init module
    loadModule(miid, self.link.session._rid, function (err, config) {
        
        if (err) {
            return self.emit('config', err || 'Module not found');
        }
        
        // handle i18n html
        if (typeof config.html === 'object') {
            config.html = config.html[self.link.session._loc] ? config.html[self.link.session._loc] : 'no html found';
        }
        
        // return client config
        self.emit('config', null, config);
    });
}

// get html snipptets (ws)
function html (err, data) {
    var self = this;
    
    var file = M.config.paths.PUBLIC_ROOT + data.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return self.emit('html', 'File not found');
        }
        
        self.emit('html', null, data);
    });
}

// browser modules (http)
function file () {
    
    var miid = self.link.path[0];
    var path = self.link.path[1];
    
    // check if request format is correct
    if (!miid || !path) {
        return self.link.send(400, "Incorrect module request URL format");
    }
    
    // the module name must be almost alphanumeric
    if (link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, "") !== link.pathname) {
        return self.link.send(400, "Incorrect data in module request URL");
    }
    
    // get miid from cache
    var cachedMiid = getCachedMiid(miid, link.session._rid);
    if (cachedMiid) {
        
        // handle compression
        if (M.config.compressFiles) {
            self.link.res.setHeader('content-encoding', 'gzip');
            self.link.res.setHeader('vary', 'accept-encoding');
        }
        
        // overwrite url
        self.link.req.url = cachedMiid.m_name + path;
        
        // server file
        return M.file.module.serve(self.link.req, self.link.res);
    }
    
    self.link.send(404, 'Miid not found');
}

// get mono client (http)
function client (){
    var self = this;
    
    if (M.config.compressFiles) {
        self.link.res.setHeader('content-encoding', 'gzip');
        self.link.res.setHeader('vary', 'accept-encoding');
        self.link.req.url = link.path[0].split('.')[0] + '.min.gz';
    
    } else {
        self.link.req.url = self.link.path[0];
    }
    
    M.file.client.serve(self.link.req, self.link.res);
}

function init (config) {
    var self = this;
    
    // setup fromclient events interface
    self.on('load', load);
    self.on('module', file);
    self.on('client', client);
    self.on('html', html);
    
    // setup toclient event interface
    self.on('config',  sendHandler('config'));
    self.on('html',  sendHandler('html'));
}

module.exports = init;
