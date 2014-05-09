var M = process.mono;
var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var broadcast = require(M.config.paths.SERVER_ROOT + 'send').broadcast;
var model = require(M.config.paths.MODELS + 'factory');
var view = require(M.config.paths.VIEWS + 'factory');

module.exports = init;

function sendHandler (event) {
    return function (err, data) {
        var self = this;
        
        // websocket link
        if (self.link && self.link.ws) {
            self.link.send(event, err, data);
        }
    };
}

// init module with newly created module instance as this
function loadinstance (name, roleId, callback) {
    var query = {
        _ro: roleId instanceof ObjectId ? roleId : ObjectId(roleId),
        name: name
    };
    
    M.store(M.config.store.systemStoreName, function (err, systemStore) {
        
        if (err) {
            return callback(err);
        }
        
        // get instance config from db
        systemStore.collection('m_instances').findOne(query, {_id: 0, name: 0}, function (err, dbInstance) {
            
            if (err || !dbInstance) {
                // M.error(M.error.ERROR_MESSAGE, command, JSON.stringify(err))
                return callback(err || 'not found');
            }
            
            // get module version from db
            systemStore.collection('m_modules').findOne({_id: dbInstance.module}, {_id: 0}, function (err, module) {
                
                if (err || !module) {
                    return callback(err || 'not found');
                }
                
                // create new Mono observer instance
                var instance = new EventEmitter();
                instance.mono = {
                    module: module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/',
                    name: name,
                    client: dbInstance.client || {},
                    
                    // allow only the clients events to be emitted form the server
                    access: {},
                    roles: {}
                };
                
                // handle ready
                instance.on('ready', function (err) {
                    callback(err,  instance.mono.client);
                });
                
                // attach the broadcast functionality
                instance.broadcast = broadcast;
                
                // save module name in client config
                instance.mono.client.module = instance.mono.module;
                
                // add roles to cache
                for (var i = 0, l = dbInstance._ro.length; i < l; ++i) {
                    instance.mono.roles[dbInstance._ro[i]] = 1;
                }
                
                // merge scripts
                // all dependencies of the instance dependencies must be in this array!
                // while installing a module, save all dependencies in the module deps
                // dependencies: ['./file.js', 's/o/modA/v']
                // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
                // => to client: ['./file.js', 's/o/n/v/file.js']
                if (module.dependencies) {
                    instance.mono.client.scripts = module.dependencies.concat(instance.mono.client.scripts || []);
                }
                
                // add client events config to client config
                if (dbInstance.client.events) {
                    
                    dbInstance.client.events.push('inst>');
                    
                    // allow server to emit client events
                    for (i = 0, l = dbInstance.client.events.length; i < l; ++i) {
                        instance.mono.access[dbInstance.client.events[i]] = true;
                    }
                }
                
                // this are the events which have automatically send as handler
                if (dbInstance.server && dbInstance.server.events) {
                    
                    dbInstance.server.events.push('<inst');
                    
                    for (i = 0, l = dbInstance.server.events.length; i < l; ++i) {
                        instance.on(dbInstance.server.events[i], sendHandler(dbInstance.server.events[i]));
                    }
                }
                
                // listen to "inst>" client event
                instance.on('inst>', load);
                
                // setup model events and add model factory to instance
                instance.model = model(instance);
                
                // setup view events and add model factory to instance
                instance.view = view(instance);
                
                // save instance in cache
                // TODO update this cache when a instance config changes
                M.cache.instances.save(name, instance);
                
                // require and init mono module
                if (module.main) {
                    // TODO do not use try catch when in dev mode
                    try {
                        var monoModule = require(M.config.paths.MODULE_ROOT + instance.mono.module + module.main);
                        
                        if (typeof monoModule === 'function') {
                            monoModule.call(instance, dbInstance.server ? dbInstance.server.data : {});
                        }
                    } catch (err) {
                        return callback('Module ' + name + ' init error: ' + err.toString());
                    }
                } else {
                    instance.emit('ready');
                }
            });
        });
    });
}

// get cached instance and check role access
function getCachedInstance (instance, roleId) {
    
    instance = M.cache.instances.get(instance);
    
    // send client config from cache
    if (
        instance &&
        (
            // check access
            instance.mono.roles['*'] ||
            instance.mono.roles[roleId]
        ) &&
        instance.mono.client
    ) {
        return instance;
    }
    
    return null;
}

// load instance configuration (ws)
function load (err, instance) {
    var self = this;
    var session = self.link.ws.session;
    
    // send client config from cache
    var cachedInstance = getCachedInstance(instance, session[M.config.session.role]);
    if (cachedInstance) {
        return self.emit('<inst', null, cachedInstance.mono.client);
    }
    
    // load and init module
    loadinstance(instance, session[M.config.session.role], function (err, config) {
        
        if (err) {
            var message = 'Error while loading module instance: ' + instance + '. Error: ' + (err || 'module not found');
            return self.emit('<inst', message);
        }
        
        // return client config
        self.emit('<inst', null, config);
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

function init () {
    var instance = new EventEmitter();
    instance.mono = {
        module: 'core',
        name: 'M',
        
        // set core module access
        access: {
            'inst>': true,
            mod: true,
            client: true
        },
        // set core module public rights
        roles: {'*': 1}
    };
    
    // attach the broadcast functionality
    instance.broadcast = broadcast;
    
    // setup client event interface
    instance.on('<inst',  sendHandler('<inst'));
    instance.on('inst>', load);
    instance.on('mod', moduleFiles);
    instance.on('client', client);
    
    // init mono module and save in cache
    M.cache.instances.save(instance.mono.name, instance);
}
