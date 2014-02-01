var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var broadcast = require('./send').broadcast;
var M = process.mono;
var coreModule = require(M.config.paths.SERVER_ROOT + 'module');

exports.send = sendHandler;
exports.load = loadInstance;
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
function loadInstance (name, roleId, callback) {
    var query = {
        name: name,
        roles: roleId instanceof ObjectId ? roleId : ObjectId(roleId)
    };
    
    // get instance config from db
    M.db.app.collection('m_instances').findOne(query, {_id: 0, name: 0}, function (err, dbInstance) {
        
        if (err || !dbInstance) {
            // M.error(M.error.ERROR_MESSAGE, command, JSON.stringify(err))
            return callback(err || 'not found');
        }
        
        // get module version from db
        M.db.app.collection('m_modules').findOne({_id: dbInstance.module}, {_id: 0}, function (err, module) {
            
            if (err || !module) {
                return callback(err || 'not found');
            }
            
            // create new Mono observer instance
            var Instance = new EventEmitter();
            Instance.mono = {
                module: module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/',
                name: name,
                client: dbInstance.client || {},
                
                // allow only the clients events to be emitted form the server
                access: {},
                roles: {}
            };
            
            // attach the broadcast functionality
            Instance.broadcast = broadcast;
            
            // save module name in client config
            Instance.mono.client.module = Instance.mono.module;
            
            // add roles to cache
            for (var i = 0, l = dbInstance.roles.length; i < l; ++i) {
                Instance.mono.roles[dbInstance.roles[i]] = 1;
            }
            
            // merge scripts
            // all dependencies of the instance dependencies must be in this array!
            // while installing a module, save all dependencies in the module deps
            // dependencies: ['./file.js', 's/o/modA/v']
            // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
            // => to client: ['./file.js', 's/o/n/v/file.js']
            if (module.dependencies) {
                Instance.mono.client.scripts = module.dependencies.concat(Instance.mono.client.scripts || []);
            }
            
            // add client events config to client config
            if (dbInstance.client.events) {
                
                // allow server to emit client events
                for (i = 0, l = dbInstance.client.events.length; i < l; ++i) {
                    Instance.mono.access[dbInstance.client.events[i]] = true;
                }
            }
            
            // this are the events which have automatically send as handler
            if (dbInstance.server && dbInstance.server.events) {
                for (i = 0, l = dbInstance.server.events.length; i < l; ++i) {
                    Instance.on(dbInstance.server.events[i], sendHandler(dbInstance.server.events[i]));
                }
            }
            
            // require and init mono module
            if (module.main) {
                try {
                    var monoModule = require(M.config.paths.MODULE_ROOT + Instance.mono.module + module.main);
                    
                    if (typeof monoModule === 'function') {
                        monoModule.call(Instance, dbInstance.server ? dbInstance.server.data : {});
                    }
                } catch (err) {
                    return callback('Module init error: ' + err.toString());
                }
            }
            
            // save instance in cache
            // TODO update this cache when a instance config changes
            M.cache.instances.save(name, Instance);
            
            callback(null,  Instance.mono.client);
        });
    });
}

function loadCoreModule () {
    var Instance = new EventEmitter();
    Instance.mono = {
        module: 'core',
        name: 'M',
        
        // set core module access
        access: {
            load: true,
            mod: true,
            dep: true,
            client: true
        },
        // set core module public rights
        roles: {'*': 1}
    };
    
    // attach the broadcast functionality
    Instance.broadcast = broadcast;
    
    // setup client event interface
    Instance.on('config',  sendHandler('config'));
    
    // init mono module and save in cache
    M.cache.instances.save(Instance.mono.name, Instance);
    coreModule.call(Instance, {});
}
