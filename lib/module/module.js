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

function sendHandler (event, instanceName) {
    return function (err, data) {
        var self = this;

        // websocket link
        if (self.link && self.link.ws) {
            self.link.send(event, err, data, instanceName);
        }
    };
}

// create instance
function instanceFactory (name, module, compInst, callback) {

    // create new Mono observer instance
    var instance = new EventEmitter();
    instance._module = module.name.replace(/_/g, '/') + '/';
    instance._name = compInst.name;
    instance._access = {};
    instance._roles = compInst.roles || {};
    instance._client = {};

    // save configs on instance
    if (compInst.config) {

        // save custom client config
        if (compInst.config.client) {
            instance._client = {
                config: compInst.config.client
            };
        }

        // server config
        instance._config = compInst.config.server || {};
    }

    // save observe infos in client
    if (compInst.O) {
        instance._client.O = compInst.O;
    }

    // save module name in client config
    instance._client.module = instance._module;

    // save load infos in client
    if (compInst.L) {
        instance._client.L = {};

        if (compInst.L.elms) {
            instance._client.L.elms = compInst.L.elms;
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
        if (compInst.L && compInst.L.scripts) {
            instance._client.L.scripts = module.dependencies.concat(compInst.L.scripts);

        } else {
            instance._client.L = instance._client.L || {};
            instance._client.L.scripts = module.dependencies;
        }
    } else if (compInst.L && compInst.L.scripts) {
        instance._client.L.scripts = compInst.L.scripts;
    }

    // handle send configurations
    var send = compInst.send || {up: [], down: []};

    if (!send.up) {
        send.up = [];
    }

    if (!send.down) {
        send.down = [];
    }

    // set up core send events
    send.up.push(env.Z_SEND_INST_REQ);
    send.down.push(env.Z_SEND_INST_RES);
    send.up.push(env.Z_SEND_MODEL_REQ);
    send.down.push(env.Z_SEND_MODEL_RES);
    send.up.push(env.Z_SEND_MODEL_DATA_REQ);
    send.down.push(env.Z_SEND_MODEL_DATA_RES);
    send.up.push(env.Z_SEND_VIEW_REQ);
    send.down.push(env.Z_SEND_VIEW_RES);

    // grant access for client emitted server events
    if (send.up) {
        for (i = 0, l = send.up.length; i < l; ++i) {
            instance._access[send.up[i]] = true;
        }

        instance._client.send = send.up;
    }

    // attach send handler for server emitted client events
    if (send.down) {
        for (i = 0, l = send.down.length; i < l; ++i) {
            instance.on(send.down[i], sendHandler(send.down[i], name));
        }
    }

    // load instance on "inst>" event
    instance.on(env.Z_SEND_INST_REQ, load);

    // setup model events and add model factory to instance
    model.setup(instance);
    instance._model = model.factory;

    // setup view events and add model factory to instance
    instance._view = view(instance);

    // attach the broadcast functionality
    instance._broadcast = broadcast;

    // save instance in cache
    // TODO update this cache when a instance config changes
    pojoInstances.set(name, instance);

    // require and init mono module
    if (module.main) {

        try {
            var monoModule = require(env.Z_PATH_PROCESS_MODULES + instance._module + module.main);

            if (typeof monoModule === 'function') {
                monoModule.call(instance, instance._config || {}, function (err) {
                    callback(err, instance._client);
                });
            }
        } catch (err) {

            // remove instance from cache
            pojoInstances.rm(name);

            callback('Module ' + compInst.name + ' init error: ' + err.toString());
        }
    } else {
        callback(null, instance._client);
    }
}

// init module with newly created module instance as this
function loadinstance (name, role, callback) {

    // get and set model config from composition store
    compInstances.set(name, role, function (err, instance) {

        if (err) {
            return callback(err);
        }
        // check access
        if (!instance) {
            return callback(new Error('Instance ' + name + ' not found.'));
        }

        compModules.set(instance.module, role, function (err, module) {

            if (err) {
                return callback(err);
            }

            // check access
            if (!module) {
                return callback(new Error('Module ' + instance.module + ' not found.'));
            }

            instanceFactory(name, module, instance, callback);
        });
    });
}

// load instance configuration (ws)
function load (err, instance) {
    var self = this;

    // send client config from cache
    var cachedInstance = pojoInstances.get(instance, self.link.role);

    // handle no access case
    if (cachedInstance === 0) {
        return self.emit(env.Z_SEND_INST_RES, 'Instance: ' + instance + '. Error: Instance not found.');
    }

    if (cachedInstance) {
        return self.emit(env.Z_SEND_INST_RES, null, cachedInstance._client);
    }

    // load and init module
    loadinstance(instance, self.link.role, function (err, client) {

        if (err) {
            return self.emit(env.Z_SEND_INST_RES, 'Instance: ' + instance + '. Error: ' + err);
        }

        // return client config
        self.emit(env.Z_SEND_INST_RES, null, client);
    });
}

// init the core module
function init () {
    var instance = new EventEmitter();

    instance._module = 'core',
    instance._name = env.Z_CORE_INST,
    instance._access = {},

    // set public rights to core module
    instance._roles = {'*': true};

    // set core module access
    instance._access[env.Z_SEND_INST_REQ] = true;
    instance._access[env.Z_SEND_MODULE_REQ] = true;
    instance._access[env.Z_SEND_CLIENT_REQ] = true;

    // setup client event interface
    instance.on(env.Z_SEND_INST_RES,  sendHandler(env.Z_SEND_INST_RES, instance._name));

    instance.on(env.Z_SEND_INST_REQ, load);
    instance.on(env.Z_SEND_MODULE_REQ, moduleFiles);
    instance.on(env.Z_SEND_CLIENT_REQ, client);

    // setup model events and add model factory to instance
    model.setup(instance);
    instance._model = model.factory;

    // attach the broadcast functionality
    instance._broadcast = broadcast;

    // init mono module and save in cache
    pojoInstances.set(instance._name, instance);
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
