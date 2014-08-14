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

function pathValue (path, scope) {

    if (!path) {
        return;
    }

    var o = path;
    path = path.split('.');
    scope = scope || this;

    // find keys in paths or return
    for (var i = 0; i < path.length; ++i) {
        if (!(scope = scope[path[i]])) {
            return;
        }
    }

    return scope;
}

function sendHandler (instanceName, self) {
    return function (err, data) {
        // websocket link
        if (self.link && self.link.ws) {
            self.link.send(err, data, instanceName);
        }
    };
}

function linkHandler (link) {
    var self = this;

    // listen to event
    self[link['1'] ? 'once' : 'on'](link.event, function (err, data) {
        self = this;

        // emit or call on a different instance
        // TODO check role access!
        if (link.to) {
            self = pojoInstances.get(link.to, self.link.ws.session.role);
            if (!self) {
                return;
            }
        }

        // create an empty data object
        if (!data && (link.data || link.item)) {
            data = {};
        }

        // handle static data
        if (link.data) {

            // create copy
            try {
                var copy = JSON.parse(JSON.stringify(link.data));

                // merge static data in data
                for (var key in copy) {
                    data[key] = copy[key];
                }
            } catch (error) {
                err = error;
            }
        }

        // apend an item to the data
        if (link.item) {
            data[link.item.name] = pathValue(link.item.path, self);
        }

        // handle method call
        if (link.call) {

            if (typeof link.call === 'string') {
                link.call = pathValue(link.call, self);
            }

            link.call.call(self, err, data, sendHandler(self._sendName, self));
        }

        // emit event
        if (link.emit) {
            self.emit(link.emit, err, data, sendHandler(self._sendName, self));
        }
    });

    // ensure clinet send array
    if (!self._client.send) {
        self._client.send = [];
    }

    // add send events to client
    self._client.send.push(link.event);
    self._access[link.event] = true;
}

// set up link configuration
function linkSetup (instance, links, callback) {

    // set up links
    for (var i = 0, link; i < links.length; ++i) {
        linkHandler.call(instance, links[i]);
    }

    callback(null, instance._client);
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
    instance._sendName = name;

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

    // setup model events and add model factory to instance
    model.setup(instance);
    instance._model = model.factory;

    // setup view events and add model factory to instance
    instance._view = view(instance);

    // handle send configurations
    if (!compInst.links) {
        compInst.links = [];
    }

    // set up core send events
    compInst.links.push({event: env.Z_SEND_INST_REQ, call: load});
    compInst.links.push({event: env.Z_SEND_MODEL_REQ, call: instance._modelService});
    compInst.links.push({event: env.Z_SEND_VIEW_REQ, call: instance._viewService});

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

                    if (err) {
                        return callback(err);
                    }

                    // setup links
                    if (compInst.links) {
                        return linkSetup(instance, compInst.links, callback);
                    }

                    callback(null, instance._client);
                });
            }
        } catch (err) {

            // remove instance from cache
            pojoInstances.rm(name);

            callback('Module ' + compInst.name + ' init error: ' + err.toString());
        }
    } else {

        // setup links
        if (compInst.links) {
            return linkSetup(instance, compInst.links, callback);
        }

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
function load (err, instance, callback) {
    var self = this;

    // send client config from cache
    var cachedInstance = pojoInstances.get(instance, self.link.role);

    // handle no access case
    if (cachedInstance === 0) {
        return callback('Instance: ' + instance + '. Error: Instance not found.');
        //self.emit(env.Z_SEND_INST_RES, 'Instance: ' + instance + '. Error: Instance not found.');
    }

    if (cachedInstance) {
        return callback(null, cachedInstance._client);
        //self.emit(env.Z_SEND_INST_RES, null, cachedInstance._client);
    }

    // load and init module
    loadinstance(instance, self.link.role, function (err, client) {

        if (err) {
            return callback('Instance: ' + instance + '. Error: ' + err);
            //self.emit(env.Z_SEND_INST_RES, 'Instance: ' + instance + '. Error: ' + err);
        }

        // return client config
        callback(null, client);
        //self.emit(env.Z_SEND_INST_RES, null, client);
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
    instance.on(env.Z_SEND_INST_REQ, function (err, data) {
        var self = this;
        load.call(self, err, data, sendHandler(instance._name, self));
    });
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
