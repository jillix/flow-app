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

/*
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
*/

// create instance
function factory (composition, callback) {

    // create new module instance
    var module_instance = new EventEmitter();

    // save composition data on the module instance
    module_instance._name = composition.name;
    module_instance._roles = composition.roles || {};
    module_instance._client = composition.client || {};
    module_instance._config = composition.config || {};

    // create properties
    module_instance._access = {};

    // pass module name to client
    module_instance._client.module = composition.module;

    // attach create link method to module instance
    module_instance.link = engine.link;

    // add fingerprints to client side scripts
    fingerprint.addToFiles(composition.module, module_instance._client.scripts, function (err, scripts) {

        if (err) {
            return callback(err);
        }

        // update scripts
        module_instance._client.scripts = scripts;

        // require the serverside module
        if (composition.main) {

            try {

                // get absolute path from the repo and relative path from the module
                var path = composition.main === '/' ? env.Z_PATH_PROCESS_REPO : env.Z_PATH_PROCESS_MODULES + instance._module;
                var require_module = require(path + module.main);

                // extend module instance with module methods
                if (require_module) {
                    for (var prop in require_module) {
                        module_instance[prop] = require_module[prop];
                    }
                }

            } catch (err) {
                return callback(err);
            }
        }

        // TODO setup flow

        // return the module instance
        callback(null, module_instance);
    });
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
