var env = process.env;
var EventEmitter = require('events').EventEmitter;

var broadcast = require(env.Z_PATH_PROJECT + 'send').broadcast;
var model = require(env.Z_PATH_MODELS + 'factory');
var view = require(env.Z_PATH_VIEWS + 'factory');
var cache = require(env.Z_PATH_CACHE + 'cache');

var instancesCache = cache('instances');
var modulesCache = cache('modules');
var clientCache = cache('client');

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

// create instance
function instanceFactory (name, module, dbInstance, callback) {

    // create new Mono observer instance
    var instance = new EventEmitter();
    instance.Z = {
        module: module.source + '/' + module.owner + '/' + module.name + '/' + module.version + '/',
        name: name,
        // allow only the clients events to be emitted form the server
        access: {},
        roles: {},
        client: {}
    };

    // save configs on instance
    if (dbInstance.config) {

        // save custom client config
        if (dbInstance.config.client) {
            instance.Z.client = {
                config: dbInstance.config.client
            };
        }

        // server config
        instance.Z.config = dbInstance.config.server || {};
    }

    // save observe infos in client
    if (dbInstance.O) {
        instance.Z.client.O = dbInstance.O;
    }

    // save module name in client config
    instance.Z.client.module = instance.Z.module;

    // add roles to cache
    for (var i = 0, l = dbInstance.roles.length; i < l; ++i) {
        instance.Z.roles[dbInstance.roles[i]] = 1;
    }

    // save load infos in client
    if (dbInstance.L) {
        instance.Z.client.L = {};

        if (dbInstance.L.elms) {
            instance.Z.client.L.elms = dbInstance.L.elms;
        }
    }

    // merge scripts
    // all dependencies of the instance dependencies must be in this array!
    // while installing a module, save all dependencies in the module deps
    // dependencies: ['./file.js', 's/o/modA/v']
    // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
    // => to client: ['./file.js', 's/o/n/v/file.js']
    if (module.dependencies) {

        // append custom instance scripts
        if (dbInstance.L && dbInstance.L.scripts) {
            instance.Z.client.L.scripts = module.dependencies.concat(dbInstance.L.scripts);

        } else {
            instance.Z.client.L.scripts = module.dependencies;
        }
    } else if (dbInstance.L && dbInstance.L.scripts) {
        instance.Z.client.L.scripts = dbInstance.L.scripts;
    }

    if (dbInstance.send) {

        // exend send config with public instance load event
        dbInstance.send.up.push('inst>');
        dbInstance.send.down.push('<inst');

        // grant access for client emitted server events
        if (dbInstance.send.up) {
            for (i = 0, l = dbInstance.send.up.length; i < l; ++i) {
                instance.Z.access[dbInstance.send.up[i]] = true;
            }

            instance.Z.client.send = dbInstance.send.up;
        }

        // attach send handler for server emitted client events
        if (dbInstance.send.down) {
            for (i = 0, l = dbInstance.send.down.length; i < l; ++i) {
                instance.on(dbInstance.send.down[i], sendHandler(dbInstance.send.down[i]));
            }
        }
    }

    // load instance on "inst>" event
    instance.on('inst>', load);

    // setup model events and add model factory to instance
    model.setup(instance);
    instance.Z.model = model.factory;

    // setup view events and add model factory to instance
    instance.Z.view = view(instance);

    // attach the broadcast functionality
    instance.broadcast = broadcast;

    // handle ready
    instance.on('ready', function (err) {
        callback(err,  instance.Z.client);
    });

    // save instance in cache
    // TODO update this cache when a instance config changes
    instancesCache.save(name, instance);

    // require and init mono module
    if (module.main) {

        try {
            var monoModule = require(env.Z_PATH_PROCESS_MODULES + instance.Z.module + module.main);

            if (typeof monoModule === 'function') {
                monoModule.call(instance, instance.Z.config || {});
            }
        } catch (err) {

            // remove instance from cache
            instancesCache.rm(name);

            return callback('Module ' + dbInstance.name + ' init error: ' + err.toString());
        }
    } else {
        instance.emit('ready');
    }
}

// init module with newly created module instance as this
function loadinstance (name, roleId, callback) {
    var query = {
        roles: roleId,
        name: name
    };

    model.factory(env.Z_INSTANCE_MODEL, function (err, instModel) {

        if (err) {
            return callback(err);
        }

        instModel.request({m: 'findOne', q: query, o: {fields: {_id: 0, name: 0}}}, function (err, dbInstance) {

            if (err || !dbInstance) {
                return callback(err || 'Instance "' + name + '" not found');
            }

            // get module from cache
            var module = modulesCache.get(dbInstance.module);
            if (module) {
                return instanceFactory(name, module, dbInstance, callback);
            }

            // get module version from db
            model.factory(env.Z_MODULE_MODEL, function (err, modModel) {

                if (err) {
                    return callback(err);
                }

                modModel.request({m: 'findOne', q: {_id: dbInstance.module}}, function (err, module) {

                    if (err || !module) {
                        return callback(err || 'not found');
                    }

                    // save module in cache
                    modulesCache.save(dbInstance.module, module);

                    // create instance
                    instanceFactory(name, module, dbInstance, callback);
                });
            });
        });
    });
}

// get cached instance and check role access
function getCachedInstance (instance, roleId) {

    instance = instancesCache.get(instance);

    // send client config from cache
    if (
        instance &&
        (
            // TODO return no access response
            // check access
            instance.Z.roles['*'] ||
            instance.Z.roles[roleId]
        ) &&
        instance.Z.client
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
    var cachedInstance = getCachedInstance(instance, session[env.Z_SESSION_ROLE_KEY]);
    if (cachedInstance) {
        return self.emit('<inst', null, cachedInstance.Z.client);
    }

    // load and init module
    loadinstance(instance, session[env.Z_SESSION_ROLE_KEY], function (err, client) {

        if (err) {
            var message = 'Error while loading module instance: ' + instance + '. Error: ' + (err || 'module not found');
            return self.emit('<inst', message);
        }

        // return client config
        self.emit('<inst', null, client);
    });
}

// load client module files (http)
function moduleFiles () {
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

    // create file path
    var path = env.Z_PATH_PROCESS_MODULES + self.link.path.join('/');

    // check cache
    var script = clientCache.get(path);
    if (script) {

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    }

    // save compressed/compiled script in cache and send it to the client
    clientCache.set(path, function (err, script) {

        if (err) {
            self.link.res.writeHead(500, {'content-type': 'text/plain'});
            return self.link.res.end(err.toString());
        }

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    });
}

// get mono client (http)
function client (){
    var self = this;
    var path = env.Z_PATH_CLIENT + self.link.path[0];

    // check cache
    var script = clientCache.get(path);
    if (script) {

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    }

    // save compressed/compiled script in cache and send it to the client
    clientCache.set(path, function (err, script) {

        if (err) {
            self.link.res.writeHead(500, {'content-type': 'text/plain'});
            return self.link.res.end(err.toString());
        }

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    });
}

function init () {
    var instance = new EventEmitter();
    instance.Z = {
        module: 'core',
        name: env.Z_CORE_INST,

        // set core module access
        access: {
            'inst>': true,
            'view>': true,
            'model>': true,
            'mod': true,
            'client': true
        },
        // set core module public rights
        roles: {'*': 1}
    };

    // setup client event interface
    instance.on('<inst',  sendHandler('<inst'));
    instance.on('<view',  sendHandler('<view'));
    instance.on('<model',  sendHandler('<model'));
    instance.on('inst>', load);
    instance.on('mod', moduleFiles);
    instance.on('client', client);

    // setup model events and add model factory to instance
    model.setup(instance);
    instance.model = model.factory;

    // setup view events and add model factory to instance
    instance.view = view(instance);

    // attach the broadcast functionality
    instance.broadcast = broadcast;

    // init mono module and save in cache
    instancesCache.save(instance.Z.name, instance);
}
