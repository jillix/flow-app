// TODO create a model from a local config object. not from a store config
var M = process.mono;
var fs = require('fs');
var storeFactory = require(M.config.paths.STORES + 'factory');

// read available store adapters to adapter cache
var adapatersPath = __dirname + '/adapters/';
var adapters = fs.readdirSync(adapatersPath);

// TODO get this values from a config
var modelConfig = {
    name: 'models',
    store: M.config.store.systemStoreName,
    adapter: 'modm',
    entity: 'm_models'
};

// save adapter paths in adapter cache
for (var i = 0; i < adapters.length; ++i) {
    adapters[adapters[i]] = adapatersPath + adapters[i] + '/' + adapters[i] + '.js';
}

exports.setup = setup;
exports.factory = factory;

function setup (instance) {

    // listen for message events
    instance.on('model_req>', messageHandler);
    instance.on('model>', factoryService);
}

function getModelInstance (cacheKey, config, project, callback) {

    storeFactory(config.store, project, function (err, store) {

        if (err) {
            return callback(err);
        }

        if (err || !adapters[config.adapter]) {
            return callback(err || 'Model adapter "' + config.adapter + '" not available.');
        }

        // require adapter
        if (typeof adapters[config.adapter] === 'string') {
            adapters[config.adapter] = require(adapters[config.adapter]);
        }

        // save model in cache
        model = adapters[config.adapter].model(store, config);
        M.cache.models.save(cacheKey, model);

        callback(null, model);
    });
}

function factory (config, callback) {

    // create cache key
    var cacheKey = (config.project || '') + config.name;

    // check cache
    var model = M.cache.models.get(cacheKey);
    if (model) {
        return callback(null, model);
    }

    // dont fetch model config for "models"
    if (config.name === modelConfig.name) {
        return getModelInstance(cacheKey, modelConfig, config.project, callback);
    }

    // fetch models with the model "models".. ah.. what?!
    factory({name: modelConfig.name, project: config.project}, function (err, models) {

        if (err) {
            return callback(err);
        }

        // TODO check access self.link.session.role
        models.request({m: 'findOne', q: {name: config.name}}, function (err, dbModel) {

            if (err || !dbModel) {
                return callback(err || 'Model "' + config.name + '" not found');
            }

            getModelInstance(cacheKey, dbModel, config.project, callback);
        });
    });
}

function factoryService (err, message) {
    var self = this;

    // check message
    if (!message) {
        return self.emit('<model', 'Bad message');
    }

    // create factory config
    if (typeof message === 'string') {
        message = {name: message};
    } else {
        message = {
            name: message[0],
            project: message[1]
        };
    }

    // send the model schema to the client
    factory(message, function (err, model) {

        if (err) {
            return self.emit('<model', err);
        }

        self.emit('<model', null, model.schema);
    });
}

// TODO check access here
function messageHandler (err, message) {
    var self = this;

    // check message
    if (!message || !message.m || !message.d) {
        return self.emit('<model_res', 'Bad message');
    }

    // get model from cache
    var model = M.cache.models.get(message.m);
    if (!model) {
        return self.emit('<model_res', 'Model not found.');
    }

    // do model request
    model.request(message.d, function (err, data) {
        self.emit('<model_res', err, data);
    });
}
