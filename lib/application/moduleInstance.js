var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var broadcast = require('./send').broadcast;
var M = process.mono;
var coreModule = require(M.config.paths.SERVER_ROOT + 'module');

exports.send = sendHandler;
exports.load = loadinstance;
exports.core = loadCoreModule;

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
                    
                    // allow server to emit client events
                    for (i = 0, l = dbInstance.client.events.length; i < l; ++i) {
                        instance.mono.access[dbInstance.client.events[i]] = true;
                    }
                }
                
                // this are the events which have automatically send as handler
                if (dbInstance.server && dbInstance.server.events) {
                    for (i = 0, l = dbInstance.server.events.length; i < l; ++i) {
                        instance.on(dbInstance.server.events[i], sendHandler(dbInstance.server.events[i]));
                    }
                }
                
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

function loadCoreModule () {
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
    
    // init mono module and save in cache
    M.cache.instances.save(instance.mono.name, instance);
    coreModule.call(instance);
}
