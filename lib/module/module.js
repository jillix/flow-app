var env = process.env;
var EventEmitter = require('events').EventEmitter;
var fingerprint = require(env.Z_PATH_UTILS + 'fingerprint');
var object = require(env.Z_PATH_UTILS + 'object');

var broadcast = require(env.Z_PATH_PROJECT + 'send').broadcast;
var model = require(env.Z_PATH_MODELS + 'factory');
var view = require(env.Z_PATH_VIEWS + 'factory');
var cache = require(env.Z_PATH_CACHE + 'cache');

// init caches
var compInstances = cache.comp('instances');
var compModules = cache.comp('modules');
var fileClient = cache.file('client');

module.exports = init;

function sendHandler (instanceName, self) {

    if (self.link) {

        // http link
        if (self.link.req) {
            return function (code, data) {
                self.link.send(code, data);
            };
        }

        // websocket link
        if (self.link.ws) {
            return function (err, data) {
                self.link.send(err, data, instanceName);
            };
        }
    }
}

function linkHandler (link) {
    var self = this;

    // listen to event
    self[link['1'] ? 'once' : 'on'](link.event, function (err, data) {
        self = this;

        // emit or call on a different instance
        // TODO check role access!
        if (link.to) {
            self = compInstances.pojo.get(link.to, self.link.ws.session.role);
            if (!self) {
                return;
            }
        }

        // create an empty data object
        if (!data && (link.data || link.add)) {
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

        // add dynamic data to the data object
        if (link.add) {
            for (var prop in link.add) {
                data[prop] = object.path(link.add[prop], self);
            }
        }

        // handle method call
        if (link.call) {

            if (typeof link.call === 'string') {
                link.call = object.path(link.call, self);
            }

            link.call.call(self, err, data, sendHandler(self._name, self));
        }

        // emit event
        if (link.emit) {
            self.emit(link.emit, err, data, sendHandler(self._name, self));
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

    // TODO better do callback buffering on instances, then copy the scripts
    instance._scripts = instance._client.L && instance._client.L.scripts ? instance._client.L.scripts.slice() : [];

    // attach create link hander method to instance
    instance._link = linkHandler;

    // add model factory to instance and setup model events
    instance.model = model.factory;
    instance._link({event: env.Z_SEND_MODEL_REQ, call: model.service});
    instance._link({event: env.Z_SEND_QUERY_REQ, call: model.queries});

    // setup view service
    instance._link({event: env.Z_SEND_VIEW_REQ, call: view});

    // handle send configurations
    if (!compInst.links) {
        compInst.links = [];
    }

    // set up core send events
    compInst.links.push({event: env.Z_SEND_INST_REQ, call: load});

    // attach the broadcast functionality
    instance._broadcast = broadcast;

    // add fingerprints to scripts
    fingerprint.addToFiles(instance._module, instance._scripts, function (err, scripts) {

        if (err) {
            return callback(err);
        }

        // update scripts
        if (scripts) {
            instance._client.L.scripts = scripts;
        }

        // send original instance name to client, in case it's an alias
        if (compInst.name !== name) {
            instance._client.name = compInst.name;

            // save instance also under original name
            compInstances.pojo.set(compInst.name, instance);
        }

        // save instance in cache
        // TODO update this cache when a instance config changes
        compInstances.pojo.set(name, instance);

        // require and init mono module
        if (module.main) {

            try {
                var monoModule = require(env.Z_PATH_PROCESS_MODULES + instance._module + module.main);

                if (typeof monoModule === 'function') {
                    monoModule.call(instance, instance._config || {}, function (err) {

                        if (err) {

                            // remove instance from cache
                            compInstances.pojo.rm(name);

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
                compInstances.pojo.rm(name);

                callback('Module ' + compInst.name + ' init error: ' + err.toString());
            }
        } else {

            // setup links
            if (compInst.links) {
                return linkSetup(instance, compInst.links, callback);
            }

            callback(null, instance._client);
        }
    }, true);
}

// init module with newly created module instance as this
function loadinstance (name, role, callback) {

    // get and set model config from composition store
    compInstances.get(name, role, function (err, instance, instanceChanged) {

        if (err) {
            return callback(err);
        }

        // check access
        if (!instance) {
            return callback(new Error('Instance ' + name + ' not found.'));
        }

        compModules.get(instance.module, role, function (err, module) {

            if (err) {
                return callback(err);
            }

            // check access
            if (!module) {
                return callback(new Error('Module ' + instance.module + ' not found.'));
            }

            // remove instance on module change
            if (!instanceChanged) {
                compModules.obs.once('change:' + instance.module, function () {
                    compInstances.rm(name, role);
                });
            }

            instanceFactory(name, module, instance, callback);
        });
    });
}

// load instance configuration (ws)
function load (err, instance, callback) {
    var self = this;

    // create start instance with hostname
    if (instance === '_') {
        instance = self.link.ws.upgradeReq.headers.host.split(':')[0].replace(/\./g, '_');

        // get the public version of the start instance
        if (!self.link.role) {
            instance += '.pub';
        }
    }

    // send client config from cache
    var cachedInstance = compInstances.pojo.get(instance, self.link.role);

    // handle no access case
    if (cachedInstance === 0) {
        return callback('Instance: ' + instance + '. Error: Instance not found.');
    }

    if (cachedInstance) {
        return callback(null, cachedInstance._client);
    }

    // load and init module
    loadinstance(instance, self.link.role, function (err, client) {

        if (err) {
            return callback('Instance: ' + instance + '. Error: ' + err);
        }

        // return client config
        callback(null, client);
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

    // attach the broadcast functionality
    instance._broadcast = broadcast;

    // init mono module and save in cache
    compInstances.pojo.set(instance._name, instance);
}

// load client module files (http)
function moduleFiles (req, res) {
    var self = this;

    // the module name must be almost alphanumeric
    if (self.link.pathname.replace(/[^a-z0-9\/\.\-_@]|\.\.\//gi, '') !== self.link.pathname) {
        res.writeHead(404, {'content-type': 'text/plain'});
        return res.end('Incorrect data in module request URL');
    }

    // get module composition
    compModules.get(

        // create module name
        self.link.path.slice(0, 4).join('_'),

        // request user role
        self.link.role,

        // callback
        function (err, module) {

            // check the roles access to the module
            if (err || !module) {
                res.writeHead(404, {'content-type': 'text/plain'});
                err = err ? err.toString() : 'Module not found.';
                res.end(err);
                return;
            }

            // save compressed/compiled script in cache and send it to the client
            fileClient.set(

                // create absolute file path
                env.Z_PATH_PROCESS_MODULES + self.link.path.join('/'),

                // callback
                function (err, script) {

                    if (err) {
                        res.writeHead(404, {'content-type': 'text/plain'});
                        res.end(err.toString());
                        return;
                    }

                    res.writeHead(200, script.http);
                    res.end(script.data);
                    return;
                },

                // pass module composition and path
                {deps: module.dependencies, path: self.link.path}
            );
        }
    );
}

// get mono client (http)
function client (req, res) {
    var self = this;

    // save compressed/compiled script in cache and send it to the client
    fileClient.set(env.Z_PATH_CLIENT + self.link.path[0], function (err, script) {

        if (err) {
            res.writeHead(500, {'content-type': 'text/plain'});
            res.end(err.toString());
            return;
        }

        res.writeHead(200, script.http);
        res.end(script.data);
        return;
    });
}
