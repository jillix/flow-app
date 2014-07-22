// TODO create a model from a local config object. not from a store config
var env = process.env;

var fs = require('fs');
var cache = require(env.Z_PATH_CACHE + 'cache');
var storeFactory = require(env.Z_PATH_STORES + 'factory');

var modelsCache = cache('models');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

var events = {
    ask: 'model>',      // idea: M>
    send: '<model',     // idea: <M
    req: 'model_req>',  // idea: m>
    res: '<model_res'   // idea: <m
};

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

exports.setup = setup;
exports.factory = factory;

function setup (instance) {

    // listen for message events
    instance.on(events.req, messageHandler);
    instance.on(events.ask, factoryService);
}

function getModelInstance (cacheKey, config, callback) {

    storeFactory(config.store, function (err, store) {

        if (err) {
            return callback(err);
        }

        if (err || !adapters[config.adapter]) {
            return callback(err || new Error('Model adapter "' + config.adapter + '" not available.'));
        }

        // require adapter
        if (typeof adapters[config.adapter] === 'string') {
            adapters[config.adapter] = require(adapters[config.adapter]);
        }

        // save model in cache
        model = adapters[config.adapter].model(store, config);
        modelsCache.set(cacheKey, model);

        callback(null, model);
    });
}

function factory (name, callback) {

    // check cache
    var model = modelsCache.get(name);
    if (model) {
        return callback(null, model);
    }

    // dont fetch model config for "models"
    if (name === env.Z_MODEL_MODELS) {
        getModelInstance(name, {
            store: env.Z_STORE_SYSTEM,
            adapter: env.Z_MODEL_ADAPTER,
            entity: env.Z_MODEL_ENTITY
        }, callback);

        return;
    }

    // fetch models with the model "models".. ah.. what?!
    factory(env.Z_MODEL_MODELS, function (err, models) {

        if (err) {
            return callback(err);
        }

        // TODO check access self.link.session.role
        models.request({m: 'findOne', q: {name: name}}, function (err, dbModel) {

            if (err || !dbModel) {
                return callback(err || new Error('Model "' + name + '" not found'));
            }

            getModelInstance(name, dbModel, callback);
        });
    });
}

function factoryService (err, modelName) {
    var self = this;

    // check message
    if (!modelName) {
        return self.emit(events.send, 'Bad message');
    }

    // send the model schema to the client
    factory(modelName, function (err, model) {

        if (err) {
            return self.emit(events.send, err);
        }

        var clientModel = {
            name: model.name,
            schema: model.schema
        };

        self.emit(events.send, null, clientModel);
    });
}

// TODO check access here
function messageHandler (err, message) {
    var self = this;

    // check message
    if (!message || !message.m || !message.d) {
        return self.emit(events.res, 'Bad message');
    }

    // get model from cache
    var model = modelsCache.get(message.m);
    if (!model) {
        return self.emit(events.res, 'Model not found.');
    }

    // do model request
    model.request(message.d, function (err, data) {
        self.emit(events.res, err, data);
    });
}
