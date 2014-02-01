var moduleInstance = require('./moduleInstance');
var M = process.mono;

// get cached Instance and check role access
function getCachedInstance (instance, roleId) {
    
    Instance = M.cache.instances.get(instance);
    
    // send client config from cache
    if (
        Instance &&
        (
            // check access
            Instance.mono.roles['*'] ||
            Instance.mono.roles[roleId]
        ) &&
        Instance.mono.client
    ) {
        return Instance;
    }
    
    return null;
}

// load Instance configuration (ws)
function load (err, Instance) {
    var self = this;
    var session = self.link.ws.session;
    
    // send client config from cache
    var cachedInstance = getCachedInstance(Instance, session[M.config.session.role]);
    if (cachedInstance) {
        return self.emit('config', null, cachedInstance.mono.client);
    }
    
    // load and init module
    moduleInstance.load(Instance, session[M.config.session.role], function (err, config) {
        
        if (err) {
            return self.emit('config', err || 'Module not found');
        }
        
        // return client config
        self.emit('config', null, config);
    });
}

// load client module files (http)
function moduleFiles () {
    var self = this;
    
    var source = self.link.path[0];
    var owner = self.link.path[1];
    var name = self.link.path[2];
    var version = self.link.path[3];
    var url = self.link.path.join('/');
    
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
    
    // overwrite url
    self.link.req.url = url;
    
    // server file
    M.file.module.serve(self.link.req, self.link.res);
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
    self.on('client', client);
}

module.exports = init;
