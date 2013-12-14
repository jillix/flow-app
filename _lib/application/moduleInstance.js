var EventEmitter = require('events').EventEmitter;
var ObjectId = require('mongodb').ObjectID;
var broadcast = require('./send').broadcast;
var M = process.mono;
var coreModule = require(M.config.paths.SERVER_ROOT + 'module');

exports.send = sendHandler;
exports.load = loadMiid;
exports.core = loadCoreModule;

function sendHandler (event) {
    return function (err, data) {
        var self = this;
        
        // websocket link
        if (self.link.ws) {
            self.link.send(event, err, data);
        }
    };
}

// init module with newly created module instance as this
function loadMiid (miid, roleId, callback) {
    var query = {
        miid: miid,
        roles: ObjectId(roleId)
    };
    
    // get miid config from db
    M.db.app.collection('m_miids').findOne(query, {_id: 0, miid: 0}, function (err, dbMiid) {
        
        if (err || !dbMiid) {
            // M.error(M.error.ERROR_MESSAGE, command, JSON.stringify(err))
            return callback(err || 'not found');
        }
        
        // get module version from db
        M.db.app.collection('m_modules').findOne({_id: dbMiid.module}, {_id: 0}, function (err, module) {
            
            if (err || !module) {
                return callback(err || 'not found');
            }
            
            // require mono module
            var moduleName = module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/';
            var monoModule;
            
            try {
                monoModule = require(M.config.paths.MODULE_ROOT + moduleName + module.main);
            } catch (err) {
                return callback(err || 'Module init error');
            }
            
            // create new Mono observer instance
            var Miid = new EventEmitter();
            Miid.mono = {
                name: moduleName,
                miid: miid,
                client: dbMiid.client,
                
                // allow only the clients events to be emitted form the server
                access: {},
                roles: {}
            };
            
            // attach the broadcast functionality
            Miid.broadcast = broadcast;
            
            // save module name in client config
            Miid.mono.client.name = Miid.mono.name;
            
            // add roles to cache
            for (var i = 0, l = dbMiid.roles.length; i < l; ++i) {
                Miid.mono.roles[dbMiid.roles[i]] = 1;
            }
            
            // merge scripts
            if (module.dependencies) {
                Miid.mono.client.scripts = module.dependencies.concat(Miid.mono.client.scripts || []);
            }
            
            // add client events config to client config
            if (dbMiid.access) {
                Miid.mono.client.events = dbMiid.access;
                
                // allow server to emit client events
                for (i = 0, l = dbMiid.access.length; i < l; ++i) {
                    Miid.mono.access[dbMiid.access[i]] = true;
                }
            }
            
            // this are the events which have automatically send as handler
            if (dbMiid.server && dbMiid.server.events) {
                for (i = 0, l = dbMiid.server.events.length; i < l; ++i) {
                    Miid.on(dbMiid.server.events[i], sendHandler(dbMiid.server.events[i]));
                }
            }
            
            // init mono module and save in cache
            // TODO update this cache when a miid config changes
            M.cache.miids.save(miid, Miid);
            monoModule.call(Miid, dbMiid.server ? dbMiid.server.data : {});
            
            callback(null,  Miid.mono.client || {});
        });
    });
}

function loadCoreModule () {
    var Miid = new EventEmitter();
    Miid.mono = {
        name: 'core',
        miid: 'M',
        
        // set core module access
        access: {
            load: true,
            module: true,
            client: true,
            getHtml: true
        },
        // set core module public rights
        roles: {'*': 1}
    };
    
    // attach the broadcast functionality
    Miid.broadcast = broadcast;
    
    // setup client event interface
    Miid.on('config',  sendHandler('config'));
    Miid.on('html',  sendHandler('html'));
    
    // init mono module and save in cache
    M.cache.miids.save(Miid.mono.miid, Miid);
    coreModule.call(Miid, {});
}
