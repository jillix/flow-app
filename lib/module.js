var EventEmitter = require('events').EventEmitter;
var fingerprint = require('./fingerprint');

// create a composition cache
var moduleInstanceCache = engine.cache.comp('moduleInstances', factory);

// module instance cache
engine.modules = {};

// listen to the core load module instance configuration event
engine.on('load', load);

// export methods
exports.access = checkAccess;
exports.factory = factory;

// check if role has access to instance and operation
function checkAccess (role, module_instance, event) {

    // get instance with role check
    module_instance = moduleInstanceCache.get(module_instance, role);

    // check if this instance has acces to the requested operation
    if (module_instance && module_instance._access[event]) {
        return instance;
    }

    return;
}

function linkHandler (link) {
    var self = this;

    // listen to event
    self[link['1'] ? 'once' : 'on'](link.event, function (event, data, callback) {
        self = this;

        // emit or call on a different instance
        // TODO check role access!
        if (link.to) {
            self = compInstances.pojo.get(link.to, event.session.role);
            if (!self) {
                return;
            }
        }

        // create an empty data object
        if (!data && (link.data || link.set)) {
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
            } catch (err) {

                // websocket requests
                if (event.ws) {
                    return callback(err);
                }

                // http requests
                return callback(500, err);
            }
        }

        // add dynamic data to the data object
        if (link.set) {
            for (var prop in link.set) {
                data[prop] = engine.path(link.set[prop], self);
            }
        }

        // handle method call
        if (link.call) {

            if (typeof link.call === 'string') {
                link.call = engine.path(link.call, self) || link.call;
            }

            if (typeof link.call !== 'function') {

                var err = new Error('links: Cannot find module method: ' + link.call);

                // websocket requests
                if (event.ws) {
                    return event.send(err);
                }

                // http requests
                return event.send(500, err);
            }

            // call linked method
            link.call.call(self, event, data, callback);
        }

        // emit event
        if (link.emit) {
            self.emit(link.emit, event, data, callback);
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
function factory (composition, callback) {

    // create new Mono observer instance
    var instance = new EventEmitter();
    instance._module = module.name ? module.name.replace(/_/g, '/') + '/' : 'c';
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
    if (compInst.flow) {
        instance._client.flow = compInst.flow;
    }

    // save module name in client config
    instance._client.module = instance._module;

    // merge scripts
    // all dependencies of the instance dependencies must be in this array!
    // while installing a module, save all dependencies in the module deps
    // dependencies: ['./file.js', 's/o/modA/v']
    // => ModA deps: ['./file.js', 's/o/modB/v'] => ModB deps: []
    // => to client: ['./file.js', 's/o/n/v/file.js']

    // append module depedency scripts
    if (module.dependencies) {
        instance._client.scripts = module.dependencies.concat(compInst.scripts || []);

    // append instance scripts
    } else if (compInst.scripts) {
        instance._client.scripts = compInst.scripts;
    }

    // TODO better do callback buffering on instances, then copy the scripts
    instance._scripts = instance._client.scripts ? instance._client.scripts.slice() : [];

    // save load infos in client
    if (compInst.load) {
        instance._client.load = compInst.load;
    }

    // attach create link hander method to instance
    instance._link = linkHandler;

    // handle send configurations
    if (!compInst.links) {
        compInst.links = [];
    }

    // attach the broadcast functionality
    //instance._broadcast = broadcast;

    // add fingerprints to scripts
    fingerprint.addToFiles(instance._module, instance._scripts, function (err, scripts) {

        if (err) {
            return callback(err);
        }

        // update scripts
        instance._client.scripts = scripts;

        // send original instance name to client, in case it's an alias
        if (compInst.name !== name) {
            instance._client.name = compInst.name;

            // save instance also under original name
            compInstances.pojo.set(compInst.name, instance);
        }

        // configure client main file
        if (module.clientMain) {
            instance._client.main = module.clientMain;
        }

        // save instance in cache
        compInstances.pojo.set(name, instance);

        // require and init module
        if (module.main) {

            try {

                // get absolute path from the repo and relative path from the module
                var path = module.main[0] === '/' ? env.Z_PATH_PROCESS_REPO : env.Z_PATH_PROCESS_MODULES + instance._module;
                var monoModule = require(path + module.main);

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

// load instance configuration (ws)
function load (link) {
    var self = this;

    // receive data
    link.data(function (err, module_instance_name) {

        // load entrypoint module instance with hostname
        if (!module_instance_name) {

            module_instance_name = link.socket.upgradeReq.headers.host.split(':')[0].replace(/\./g, '_');

            // get the public version of the start instance
            if (!link.role) {
                module_instance_name += '.pub';
            }
        }

        // get the module instance
        moduleInstanceCache.get(module_instance_name, link.role, function (err, module_instance) {

            // handle error
            if (err || !module_instance) {
                return link.end('Module instance "' + module_instance_name + '" ' + err || 'not found.');
            }

            // end link and send data
            link.end(null, module_instance._client);
        });
    });
}
