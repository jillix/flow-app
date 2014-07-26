// TODO create a model from a local config object. not from a store config
var env = process.env;

var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');
var storeFactory = require(env.Z_PATH_STORES + 'factory');

var pojoModels = cache.pojo('models');
var compModels = cache.comp('models');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

exports.setup = setup;
exports.factory = factory;

function setup (instance) {

    // listen for message events
    instance.on(env.Z_SEND_MODEL_DATA_REQ, messageHandler);
    instance.on(env.Z_SEND_MODEL_REQ, factoryService);
}
function factory (name, role, callback) {

    // check cache
    var model = pojoModels.get(name, role);

    if (model === 0) {
        return callback(new Error('Model ' + name + ' not found.'));
    }

    if (model) {
        return callback(null, model);
    }

    // get and set model config from composition store
    compModels.set(name, role, function (err, comp_model) {

        if (err || !comp_model) {
            return callback(err || new Error('Model ' + name + ' not found.'));
        }

        // get connected store
        storeFactory(comp_model.store, role, function (err, store) {

            if (err) {
                return callback(err);
            }

            if (err || !adapters[comp_model.adapter]) {
                return callback(err || new Error('Model adapter "' + comp_model.adapter + '" not available.'));
            }

            // require adapter
            if (typeof adapters[comp_model.adapter] === 'string') {
                adapters[comp_model.adapter] = require(adapters[comp_model.adapter]);
            }

            // save model in cache
            model = adapters[comp_model.adapter].model(store, comp_model);

            // save roels on model
            model._roles = comp_model.roles;

            pojoModels.set(name, model);

            callback(null, model);
        });
    });
}

// listen to model request
function factoryService (err, name) {
    var self = this;
    // check message
    if (!name) {
        return self.emit(env.Z_SEND_MODEL_RES, 'Bad message');
    }

    // send the model schema to the client
    factory(name, self.link.role, function (err, model) {

        if (err) {
            return self.emit(env.Z_SEND_MODEL_RES, err);
        }

        var clientModel = {
            name: model.name,
            schema: model.schema
        };

        self.emit(env.Z_SEND_MODEL_RES, null, clientModel);
    });
}

// handle model data request
function messageHandler (err, message) {
    var self = this;

    // check message
    if (!message || !message.m || !message.d) {
        return self.emit(env.Z_SEND_MODEL_DATA_RES, 'Bad message');
    }

    // get model from cache
    var model = pojoModels.get(message.m, self.link.role);

    if (!model) {
        return self.emit(env.Z_SEND_MODEL_DATA_RES, 'Model not found.');
    }

    // do model request
    model.request(message.d, function (err, data) {
        self.emit(env.Z_SEND_MODEL_DATA_RES, err, data);
    });
}
