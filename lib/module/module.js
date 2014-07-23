var env = process.env;
var EventEmitter = require('events').EventEmitter;

var broadcast = require(env.Z_PATH_PROJECT + 'send').broadcast;
var model = require(env.Z_PATH_MODELS + 'factory');
var view = require(env.Z_PATH_VIEWS + 'factory');
var cache = require(env.Z_PATH_CACHE + 'cache');

// init caches
var pojoInstances = cache.pojo('instances');
var compInstances = cache.comp('instances');
var pojoModules = cache.pojo('modules');
var compModules = cache.comp('modules');
var fileClient = cache.file('client');

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
        module: module.name.replace(/_/g, '/') + '/',
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
        dbInstance.send.up.push(env.Z_SEND_INST_REQ);
        dbInstance.send.down.push(env.Z_SEND_INST_RES);

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
    instance.on(env.Z_SEND_INST_REQ, load);

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
    pojoInstances.set(name, instance);

    // require and init mono module
    if (module.main) {

        try {
            var monoModule = require(env.Z_PATH_PROCESS_MODULES + instance.Z.module + module.main);

            if (typeof monoModule === 'function') {
                monoModule.call(instance, instance.Z.config || {});
            }
        } catch (err) {

            // remove instance from cache
            pojoInstances.rm(name);

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

    // get and set model config from composition store
    compInstances.set(name, function (err, instance) {

        if (err) {
            return callback(err);
        }
        // check access
        if (!instance.roles['*'] && !instance.roles[roleId]) {
            return callback(new Error('Instance not found.'));
        }

        compModules.set(instance.module, function (err, module) {

            if (err) {
                return callback(err);
            }

            instanceFactory(name, module, instance, callback);
        });
    });
}

// get cached instance and check role access
function getCachedInstance (instance, roleId) {

    instance = pojoInstances.get(instance);

    if (!instance) {
        return;
    }

    // send client config from cache
    if (
        instance.Z.client &&
        (
            // check access
            instance.Z.roles['*'] ||
            instance.Z.roles[roleId]
        )
    ) {
        return instance;
    }

    return 1;
}

// load instance configuration (ws)
function load (err, instance) {
    var self = this;
    var session = self.link.ws.session;

    // send client config from cache
    var cachedInstance = getCachedInstance(instance, session[env.Z_SESSION_ROLE_KEY]);

    // handle no access case
    if (cachedInstance === 1) {
        return self.emit(env.Z_SEND_INST_RES, 'Error while loading module instance: ' + instance + '. Error: Instance not found.');
    }

    if (cachedInstance) {
        return self.emit(env.Z_SEND_INST_RES, null, cachedInstance.Z.client);
    }

    // load and init module
    loadinstance(instance, session[env.Z_SESSION_ROLE_KEY], function (err, client) {

        if (err) {
            var message = 'Error while loading module instance: ' + instance + '. Error: ' + (err || 'Instance not found.');
            return self.emit(env.Z_SEND_INST_RES, message);
        }

        // return client config
        self.emit(env.Z_SEND_INST_RES, null, client);
    });
}

// init the core module
function init () {
    var instance = new EventEmitter();
    instance.Z = {
        module: 'core',
        name: env.Z_CORE_INST,
        access: {},
        // set core module public rights
        roles: {'*': 1}
    };

    // set core module access
    instance.Z.access[env.Z_SEND_INST_REQ] = true;
    instance.Z.access[env.Z_SEND_MODEL_REQ] = true;
    instance.Z.access[env.Z_SEND_MODULE_REQ] = true;
    instance.Z.access[env.Z_SEND_CLIENT_REQ] = true;

    // TOOD is view needed on core instance?
    //instance.Z.access['V>'] = true;
    //instance.on('<V',  sendHandler('<V'));

    // setup client event interface
    instance.on(env.Z_SEND_INST_RES,  sendHandler(env.Z_SEND_INST_RES));
    instance.on(env.Z_SEND_MODEL_RES,  sendHandler(env.Z_SEND_MODEL_RES));
    instance.on(env.Z_SEND_INST_REQ, load);
    instance.on(env.Z_SEND_MODULE_REQ, moduleFiles);
    instance.on(env.Z_SEND_CLIENT_REQ, client);

    // setup model events and add model factory to instance
    model.setup(instance);
    instance.model = model.factory;

    // TOOD is view needed on core instance?
    // setup view events factory to instance
    //instance.view = view(instance);

    // attach the broadcast functionality
    instance.broadcast = broadcast;

    // init mono module and save in cache
    pojoInstances.set(instance.Z.name, instance);
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
    var script = fileClient.get(path);
    if (script) {

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    }

    // save compressed/compiled script in cache and send it to the client
    fileClient.set(path, function (err, script) {

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
    var script = fileClient.get(path);
    if (script) {

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    }

    // save compressed/compiled script in cache and send it to the client
    fileClient.set(path, function (err, script) {

        if (err) {
            self.link.res.writeHead(500, {'content-type': 'text/plain'});
            return self.link.res.end(err.toString());
        }

        self.link.res.writeHead(200, script.http);
        self.link.res.end(script.data);
        return;
    });
}
