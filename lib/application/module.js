var fs = require('fs');
var moduleInstance = require('./moduleInstance');
var M = process.mono;

// get cached miid and check role access
function getCachedMiid (miid, roleId) {
    
    miid = M.cache.miids.get(miid);
    
    // send client config from cache
    if (
        miid &&
        (
            // check access
            miid.mono.roles['*'] ||
            miid.mono.roles[roleId]
        ) &&
        miid.mono.client
    ) {
        return miid;
    }
    
    return null;
}

// load miid configuration (ws)
function load (err, miid) {
    var self = this;
    var session = self.link.ws.session;
    
    // send client config from cache
    var cachedMiid = getCachedMiid(miid, session[M.config.session.role]);
    if (cachedMiid) {
        return self.emit('config', null, cachedMiid.mono.client);
    }
    
    // load and init module
    moduleInstance.load(miid, session[M.config.session.role], function (err, config) {
        
        if (err) {
            return self.emit('config', err || 'Module not found');
        }
        
        // handle i18n html
        if (typeof config.html === 'object') {
            config.html = config.html[session[M.config.session.locale]] ? config.html[session[M.config.session.locale]] : 'no html found';
        }
        
        // return client config
        self.emit('config', null, config);
    });
}

// get html snipptets (ws)
function html (err, data) {
    var self = this;
    
    if (!data) {
        return self.emit('html', 'No path given');
    }
    
    var file = M.config.paths.PUBLIC_ROOT + data.replace(/[^a-z0-9\/\.\-_]|\.\.\//gi, "");
    fs.readFile(file, {encoding: 'utf8'}, function (err, data) {
        
        if (err) {
            return self.emit('html', 'File not found');
        }
        
        self.emit('html', null, data);
    });
}

// browser modules (http)
function moduleFiles () {
    var self = this;
    
    var miid = self.link.path[0];
    var path = self.link.path[1];
    
    // check if request format is correct
    if (!miid || !path) {
        return self.link.send(400, "Incorrect module request URL format");
    }
    
    // the module name must be almost alphanumeric
    if (self.link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, "") !== self.link.pathname) {
        return self.link.send(400, "Incorrect data in module request URL");
    }
    
    // get miid from cache
    
    var cachedMiid = getCachedMiid(miid, self.link.req.session[M.config.session.role]);
    if (cachedMiid) {
        
        // handle compression
        if (M.config.compressFiles) {
            self.link.res.setHeader('content-encoding', 'gzip');
            self.link.res.setHeader('vary', 'accept-encoding');
        }
        
        // overwrite url
        self.link.req.url = cachedMiid.mono.name + path;
        
        // server file
        return M.file.module.serve(self.link.req, self.link.res);
    }
    
    self.link.send(404, 'Miid not found');
}

function dependency () {
    var self = this;
    
    var source = self.link.path[0];
    var owner = self.link.path[1];
    var name = self.link.path[2];
    var version = self.link.path[3];
    
    // check if request format is correct
    if (!source || !owner || !name || !version) {
        return self.link.send(400, "Incorrect module request URL format");
    }
    
    // the module name must be almost alphanumeric
    if (self.link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, "") !== self.link.pathname) {
        return self.link.send(400, "Incorrect data in module request URL");
    }
    
    // handle compression
    if (M.config.compressFiles) {
        self.link.res.setHeader('content-encoding', 'gzip');
        self.link.res.setHeader('vary', 'accept-encoding');
    }
    
    // overwrite url source + '/' + owner + '/' + name + '/' + version + '/' + 
    self.link.req.url = self.link.path.join('/');
    
    // server file
    return M.file.module.serve(self.link.req, self.link.res);
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
    
    // setup client event interface
    self.on('load', load);
    self.on('mod', moduleFiles);
    self.on('dep', dependency);
    self.on('client', client);
    self.on('getHtml', html);
}

module.exports = init;
