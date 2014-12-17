// TODO create a model from a local config object. not from a store config
var env = process.env;

var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');
var storeFactory = require(env.Z_PATH_STORES + 'factory');
var object = require(env.Z_PATH_UTILS + 'object');
var compModels = cache.comp('models');
var compStores = cache.comp('stores');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

exports.factory = factory;
exports.service = factoryService;
exports.queries = messageHandler;

function factory (name, role, callback) {

    // check cache
    var model = compModels.pojo.get(name, role);

    if (model === 0) {
        return callback(new Error('Model ' + name + ' not found.'));
    }

    if (model) {
        return callback(null, model);
    }

    // get and set model config from composition store
    compModels.get(name, role, function (err, comp_model, modelChanged) {

        if (err || !comp_model) {
            return callback(err || new Error('Model ' + name + ' not found.'));
        }

        // get connected store
        storeFactory(comp_model.store, role, function (err, store) {

            if (err) {
                return callback(err);
            }

            // handle error and check if adapter exists
            if (err || !adapters[comp_model.adapter]) {
                return callback(err || new Error('Model adapter "' + comp_model.adapter + '" not available.'));
            }

            // require adapter
            if (typeof adapters[comp_model.adapter] === 'string') {
                adapters[comp_model.adapter] = require(adapters[comp_model.adapter]);
            }

            // save model in cache
            model = adapters[comp_model.adapter].model(store, comp_model);

            // extend model with query function
            model.query = createQuery;

            // save adapter name on model
            model._adapter = comp_model.adapter;

            // query container
            model.queries = {};

            // create queries from the config
            if (comp_model.queries) {
                for (var i = 0; i < comp_model.queries.length; ++i) {
                    model.query(comp_model.queries[i]);
                }
            }

            // save roles on model
            model._roles = comp_model.roles;

            // remove model on store change
            // TODO what about the connected drivers? must the connection(s) be closed
            if (!modelChanged) {
                compStores.obs.once('change:' + comp_model.store, function () {
                    compModels.rm(name, role);
                });
            }

            // save model in cache
            compModels.pojo.set(name, model);

            callback(null, model);
        });
    });
}

// listen to model request
function factoryService (event, name, callback) {
    var self = this;

    // check message
    if (!name) {
        return callback('Bad message');
    }

    // send the model schema to the client
    factory(name, event.role, function (err, model) {

        if (err) {
            return callback(err);
        }

        var clientModel = {
            name: model.name,
            schema: model.schema
        };

        // append flow config
        if (model.flow) {
            clientModel.flow = model.flow;
        }

        callback(null, clientModel);
    });
}

// handle requests
function createQuery (config) {
    var self = this;
    var handler;

    // get custom query handlers
    if (config.handler) {
        handler = object.path(config.handler/* TODO pass instance*/);

        if (typeof handler === 'function') {
            handler = config.handler.call(self, config.request);
        }
    } else {
        // create a query handler with the adapters query factory
        handler = adapters[self._adapter].query.call(self, config.request);
    }


    // don't add query to container if no hander is created
    if (!handler) {
        return;
    }

    // add query function to query container
    self.queries[config.name] = function (data, callback) {

        // copy request object
        var request = JSON.parse(JSON.stringify(config.request));

        // merge data into request
        if (config.add && data) {

            var value;

            // extend request object
            for (var key in config.add) {

                if ((value = object.path(config.add[key], data)) !== undefined) {
                    request[key] = value;
                }
            }
        }

        // nest flat paths
        request = object.deep(request);

        // execute query with request infos
        handler(request, callback);
    };
}

// handle model data request
function messageHandler (event, message, callback) {
    var self = this;

    // check message
    if (!message || !message.m || !message.q) {
        return callback(new Error('Bad message.'));
    }

    // get model from cache
    var model = compModels.pojo.get(message.m, event.role);

    if (!model) {
        return callback(new Error('Model "' + message.m + '" not found.'));
    }

    if (!model.queries[message.q]) {
        return callback(new Error('Model query "' + message.q + '" not found.'));
    }

    // do model query request
    model.queries[message.q](message.d, callback);
}
